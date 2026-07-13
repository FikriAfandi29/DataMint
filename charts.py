import pandas as pd


# Palet warna yang lebih lengkap
CHART_COLORS = [
    "#1e3a5f",  # navy
    "#10b981",  # mint/green
    "#ef4444",  # red
    "#f59e0b",  # amber
    "#8b5cf6",  # purple
    "#06b6d4",  # cyan
    "#f97316",  # orange
    "#ec4899",  # pink
    "#14b8a6",  # teal
    "#6366f1",  # indigo
    "#84cc16",  # lime
    "#e11d48",  # rose
]

MAX_SERIES = 8  # maksimum series yang ditampilkan di chart


def build_chart(df: pd.DataFrame):

    if df.empty:
        return [], []

    columns = list(df.columns)

    # ======================
    # cari label x (kolom waktu)
    # ======================

    label_col = None

    for c in columns:
        if str(c).lower() in ["date", "year", "period", "time", "timestamp"]:
            label_col = c
            break

    if label_col is None:
        label_col = columns[0]

    # ======================
    # cari numeric columns
    # ======================

    numeric_cols = []

    for c in columns:
        if c == label_col:
            continue
        try:
            converted = pd.to_numeric(df[c], errors='coerce')
            # Pastikan minimal ada 1 nilai valid
            if converted.notna().sum() > 0:
                numeric_cols.append(c)
        except Exception:
            pass

    # ======================
    # Trim jika terlalu banyak kolom
    # ======================

    if len(numeric_cols) > MAX_SERIES:
        try:
            # Pilih kolom dengan variance tertinggi (paling informatif)
            variances = {}
            for c in numeric_cols:
                converted = pd.to_numeric(df[c], errors='coerce')
                variances[c] = converted.std()

            numeric_cols = sorted(
                numeric_cols,
                key=lambda c: variances.get(c, 0),
                reverse=True
            )[:MAX_SERIES]

        except Exception:
            numeric_cols = numeric_cols[:MAX_SERIES]

    # ======================
    # Build chart series
    # ======================

    chart_series = []

    for i, col in enumerate(numeric_cols):
        chart_series.append({
            "key": str(col),
            "name": str(col),
            "color": CHART_COLORS[i % len(CHART_COLORS)],
            "type": "line"
        })

    # ======================
    # Build chart data
    # ======================

    chart_data = []

    for _, row in df.iterrows():

        item = {"label": str(row[label_col])}

        for col in numeric_cols:
            try:
                val = float(pd.to_numeric(row[col], errors='coerce'))
                item[col] = None if pd.isna(val) else val
            except Exception:
                item[col] = None

        chart_data.append(item)

    return chart_series, chart_data