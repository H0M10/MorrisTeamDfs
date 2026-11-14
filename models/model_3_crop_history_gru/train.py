"""Modelo 3. Lectura del historial de cultivos.

Etiqueta: CDL agrupado (alfalfa, grano pequeño, maíz, barbecho).
Algoritmo: GRU pequeña con atención temporal sobre 12 meses de índices,
exportada a ONNX para correr en CPU.
Métrica: F1 por clase en un valle no visto. Línea base: decir siempre la clase
más frecuente del entrenamiento.

Los pesos de atención se muestran como "meses que más pesaron en la lectura",
no como explicación causal.

    python models/model_3_crop_history_gru/train.py --table tabla.parquet --test-valley diamond_valley_nv
    python models/model_3_crop_history_gru/train.py --sample

Necesita PyTorch: NO se corre en las laptops de 8 GB. Úsalo en Colab (con o sin
GPU; es un modelo pequeño) o en la máquina rentada. Memoria: unos 3 GB.
Este guion no se ha ejecutado todavía: la primera corrida es su prueba.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch import nn

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import common  # noqa: E402

BANDS = ["ndvi", "ndmi", "bsi", "ndti"]
N_CLASSES = len(common.CROP_GROUPS)
HIDDEN = 32
EPOCHS = 60


class CropHistoryGRU(nn.Module):
    """Entrada: (lote, 12 meses, 4 índices + 1 marca de dato faltante)."""

    def __init__(self) -> None:
        super().__init__()
        self.gru = nn.GRU(len(BANDS) + 1, HIDDEN, batch_first=True)
        self.score = nn.Linear(HIDDEN, 1)
        self.head = nn.Linear(HIDDEN, N_CLASSES)

    def forward(self, sequence: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        states, _ = self.gru(sequence)
        attention = torch.softmax(self.score(states).squeeze(-1), dim=1)  # un peso por mes
        context = (states * attention.unsqueeze(-1)).sum(dim=1)
        return self.head(context), attention


def sequences(table: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, pd.DataFrame]:
    """Una secuencia de 12 meses por parcela y año con etiqueta conocida."""
    table = table[table["crop_group"].isin(common.CROP_GROUPS)]
    xs, ys, keys = [], [], []
    for (parcel, valley, year), group in table.groupby(["parcel_id", "valley", "year"]):
        months = group.set_index("month_num").reindex(range(1, 13))
        values = months[BANDS].to_numpy(dtype=np.float32)
        missing = np.isnan(values).any(axis=1, keepdims=True).astype(np.float32)
        if missing.sum() > 6:
            continue  # más de medio año sin imágenes: no se lee
        xs.append(np.concatenate([np.nan_to_num(values), missing], axis=1))
        ys.append(common.CROP_CODE[group["crop_group"].iloc[0]])
        keys.append({"parcel_id": parcel, "valley": valley, "year": year})
    return np.stack(xs), np.array(ys, dtype=np.int64), pd.DataFrame(keys)


def f1_per_class(truth: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    out = {}
    for name, code in common.CROP_CODE.items():
        tp = int(((predicted == code) & (truth == code)).sum())
        fp = int(((predicted == code) & (truth != code)).sum())
        fn = int(((predicted != code) & (truth == code)).sum())
        out[name] = 2 * tp / (2 * tp + fp + fn) if (2 * tp + fp + fn) else 0.0
    return out


def main() -> None:
    args = common.parse_args(__doc__.splitlines()[0], "model_3_crop_history_gru")
    torch.manual_seed(7)
    x, y, keys = sequences(common.load_table(args))
    train_keys, test_keys = common.split_by_valley(keys, args.test_valley)
    fit_keys, last_keys = common.split_last_year(train_keys)
    fit_idx, last_idx, test_idx = fit_keys.index.to_numpy(), last_keys.index.to_numpy(), test_keys.index.to_numpy()

    counts = np.bincount(y[fit_idx], minlength=N_CLASSES).astype(np.float32)
    weights = torch.tensor(counts.sum() / np.maximum(counts, 1) / N_CLASSES)
    model = CropHistoryGRU()
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-3, weight_decay=1e-4)
    loss_fn = nn.CrossEntropyLoss(weight=weights)
    x_fit, y_fit = torch.from_numpy(x[fit_idx]), torch.from_numpy(y[fit_idx])

    def predict(indices: np.ndarray) -> np.ndarray:
        model.eval()
        with torch.no_grad():
            logits, _ = model(torch.from_numpy(x[indices]))
        return logits.argmax(dim=1).numpy()

    best_state, best_macro = None, -1.0
    for epoch in range(EPOCHS):
        model.train()
        order = torch.randperm(len(x_fit))
        for start in range(0, len(order), 64):
            batch = order[start : start + 64]
            optimizer.zero_grad()
            logits, _ = model(x_fit[batch])
            loss_fn(logits, y_fit[batch]).backward()
            optimizer.step()
        # El último año de los valles de entrenamiento elige la mejor época.
        macro = float(np.mean(list(f1_per_class(y[last_idx], predict(last_idx)).values())))
        if macro > best_macro:
            best_macro, best_state = macro, {k: v.clone() for k, v in model.state_dict().items()}
        if epoch % 10 == 0:
            print(f"época {epoch:3d}  F1 macro en el último año: {macro:.3f}")
    model.load_state_dict(best_state)

    per_class = f1_per_class(y[test_idx], predict(test_idx))
    macro = float(np.mean(list(per_class.values())))
    majority = int(np.argmax(counts))
    baseline_per_class = f1_per_class(y[test_idx], np.full(len(test_idx), majority))
    baseline_macro = float(np.mean(list(baseline_per_class.values())))
    print(f"Valle no visto ({len(test_idx)} secuencias):")
    for name in common.CROP_GROUPS:
        print(f"  {name:<12} F1 {per_class[name]:.3f}   (línea base {baseline_per_class[name]:.3f})")
    print(f"  F1 macro     {macro:.3f}   (línea base {baseline_macro:.3f})")

    args.out.mkdir(parents=True, exist_ok=True)
    model.eval()
    torch.onnx.export(
        model,
        (torch.zeros(1, 12, len(BANDS) + 1),),
        str(args.out / "model.onnx"),
        input_names=["sequence"],
        output_names=["logits", "attention"],
        dynamic_axes={"sequence": {0: "batch"}, "logits": {0: "batch"}, "attention": {0: "batch"}},
        opset_version=17,
    )

    # Comprueba que el ONNX en CPU da lo mismo que PyTorch.
    import onnxruntime  # noqa: PLC0415

    session = onnxruntime.InferenceSession(str(args.out / "model.onnx"), providers=["CPUExecutionProvider"])
    onnx_logits, onnx_attention = session.run(None, {"sequence": x[test_idx]})
    with torch.no_grad():
        torch_logits, _ = model(torch.from_numpy(x[test_idx]))
    assert np.allclose(onnx_logits, torch_logits.numpy(), atol=1e-4), "ONNX y PyTorch no coinciden"
    assert np.allclose(onnx_attention.sum(axis=1), 1.0, atol=1e-4), "la atención no suma 1"
    print("ONNX verificado en CPU: coincide con PyTorch.")

    common.write_metrics(
        args,
        common.metric_card(macro, "F1", f"F1 macro de cuatro clases en '{args.test_valley}'", "30 m", args.sample),
        common.metric_card(baseline_macro, "F1", f"F1 macro de decir siempre '{common.CROP_GROUPS[majority]}' en '{args.test_valley}'", "30 m", args.sample),
        common.partition_text(args.test_valley),
        {"classes": common.CROP_GROUPS, "input": {"name": "sequence", "shape": ["batch", 12, len(BANDS) + 1],
         "columns": [*BANDS, "missing_flag"]}, "outputs": ["logits", "attention"],
         "f1_per_class": per_class, "baseline_f1_per_class": baseline_per_class,
         "f1_macro_last_year": round(best_macro, 4), "n_test": int(len(test_idx))},
    )


if __name__ == "__main__":
    main()
