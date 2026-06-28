import pandas as pd


def build_chart(df: pd.DataFrame):

    if df.empty:
        return [], []

    columns = list(df.columns)

    # ======================
    # cari label x
    # ======================

    label_col = None

    for c in columns:
        if str(c).lower() in [
            "date",
            "year",
            "period",
            "time",
            "timestamp"
        ]:
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
            pd.to_numeric(df[c])
            numeric_cols.append(c)
        except:
            pass

    # ======================
    # warna otomatis
    # ======================

    colors = [
        "navy",
        "mint",
        "#ef4444",
        "#f59e0b",
        "#8b5cf6",
        "#06b6d4"
    ]

    chart_series = []

    for i, col in enumerate(numeric_cols):

        chart_series.append({
            "key": str(col),
            "name": str(col),
            "color": colors[i % len(colors)],
            "type": "line"
        })

    chart_data = []

    for _, row in df.iterrows():

        item = {
            "label": str(row[label_col])
        }

        for col in numeric_cols:

            try:
                item[col] = float(row[col])
            except:
                item[col] = None

        chart_data.append(item)

    return chart_series, chart_data