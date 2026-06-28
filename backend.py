import sys
import json
import traceback
from datetime import datetime
import pandas as pd
import math  # ← TAMBAHKAN INI
import numpy as np  # ← TAMBAHKAN INI
from openai import OpenAI
from google import genai
from google.genai import types

# Import dari file core dan miners
from core import st, GEMINI_MODELS, NVIDIA_API_KEY, GROQ_API_KEY
from miners import *

# ===== TAMBAHKAN FUNCTION INI =====
def clean_nan_values(obj):
    """
    Recursively replace NaN, Infinity, dan None dengan null/string kosong
    untuk memastikan JSON valid.
    """
    if isinstance(obj, dict):
        return {k: clean_nan_values(v) for k, v in obj.items()}
    
    elif isinstance(obj, list):
        return [clean_nan_values(item) for item in obj]
    
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    
    elif isinstance(obj, (pd.Series, pd.DataFrame)):
        # Convert pandas object ke dict dulu
        return clean_nan_values(obj.to_dict())
    
    elif pd.isna(obj):
        return None
    
    return obj

def call_groq(prompt, model_name="openai/gpt-oss-120b"):
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    completion = client.chat.completions.create(
        model=model_name, messages=[{"role": "user", "content": prompt}],
        temperature=0.2, max_completion_tokens=4096
    )
    return completion.choices[0].message.content

def call_nemotron(prompt):
    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=NVIDIA_API_KEY)
    completion = client.chat.completions.create(
        model="nvidia/nemotron-3-ultra-550b-a55b", messages=[{"role": "user", "content": prompt}],
        temperature=0.2, max_tokens=4096
    )
    return completion.choices[0].message.content

def merge_live_dataframe(res_json, df):
    try:
        df = df.copy()

        # Replace NaN di DataFrame
        df = df.replace({np.nan: None, np.inf: None, -np.inf: None})

        date_col = next((c for c in df.columns if str(c).lower() in ['date', 'year', 'period', 'timestamp', 'time']), df.columns[0])
        df[date_col] = df[date_col].astype(str)
        res_json["columns"] = [str(c) for c in df.columns]
        
        data_rows = []
        for _, row in df.iterrows():
            row_dict = {}
            for col in df.columns:
                val = row[col]
                 # ===== UPDATE BAGIAN INI =====
                if pd.isna(val) or val is None:
                    row_dict[str(col)] = None  # ← Gunakan None, bukan ""
                elif isinstance(val, float):
                    if math.isnan(val) or math.isinf(val):
                        row_dict[str(col)] = None
                    elif "volume" in str(col).lower():
                        row_dict[str(col)] = f"{val:,.0f}"
                    else:
                        row_dict[str(col)] = f"{val:.2f}"
                elif isinstance(val, (int, float)):
                    row_dict[str(col)] = f"{val:,.0f}" if "volume" in str(col).lower() else f"{val:.2f}"
                else:
                    row_dict[str(col)] = str(val)
            
            data_rows.append(row_dict)
        
        res_json["data"] = data_rows

        from charts import build_chart

        series, chart = build_chart(df)

        res_json["chartSeries"] = series
        res_json["chartData"] = chart
        
        if "metadata" not in res_json: res_json["metadata"] = {}
        res_json["metadata"]["observations"] = f"{len(df)} records"
    except Exception as e:
        print(f"DEBUG: Exception in merge_live_dataframe: {e}", file=sys.stderr)
    return res_json

def generate_smart_fallback_data(query_str):
    return {
        "title": f"Synthesized Profile: {query_str}", "sources": ["DataMint"],
        "metadata": {"frequency": "Annual", "unit": "Index", "lastUpdated": "June 2026", "observations": "0", "sourceUrl": ""},
        "columns": ["Year", "Index"], "data": [{"Year": "2026", "Index": "100"}], "chartSeries": [], "chartData": []
    }

def run_agent_query(user_query: str):
    try:
        client = genai.Client(vertexai=True, project="gen-lang-client-0971794485", location="us-central1")
    except Exception as e:
        client = None

    st.session_state.all_dfs = []

    # ==============================================================
    # ROUTING CERDAS: Memfilter API Berdasarkan Keyword Pertanyaan
    # ==============================================================
    query_lower = user_query.lower()
    active_tools = []

    # Deteksi flag
    is_indonesia = any(w in query_lower for w in ['indonesia', 'bps', 'bi', 'rupiah', 'pdrb', 'idn'])
    is_gdp       = any(w in query_lower for w in ['gdp', 'pdb', 'gross domestic'])
    is_stock     = any(w in query_lower for w in ['stock', 'saham', 'price', 'crypto', 'cash flow', 'sec', 'meta', 'aapl', 'ticker'])
    is_academic  = any(w in query_lower for w in ['jurnal', 'paper', 'academic', 'elsevier', 'springer', 'literature'])
    is_us        = any(w in query_lower for w in ['bea', 'nipa', 'united states', 'us gdp', 'american'])
    is_ecb       = any(w in query_lower for w in ['ecb', 'eur', 'euro', 'exchange rate'])

    if is_stock:
        active_tools.extend([fetch_stock_data, fetch_sec_cashflow, fetch_news_data])

    elif is_academic:
        active_tools.extend([fetch_elsevier_literature, fetch_springer_literature, fetch_nasa_small_body_data])

    elif is_indonesia and is_gdp:
        # GDP Indonesia → World Bank dulu, Supabase sebagai fallback
        active_tools.extend([fetch_macro_data, fetch_supabase_indicator, fetch_imf_data])

    elif is_indonesia:
        # Indikator Indonesia non-GDP → Supabase/BPS dulu
        active_tools.extend([fetch_supabase_indicator, fetch_macro_data, fetch_imf_data])

    elif is_us:
        active_tools.extend([fetch_bea_nipa_data, fetch_bea_industry_data, fetch_fred_data, fetch_macro_data])

    elif is_gdp:
        # GDP negara lain
        active_tools.extend([fetch_macro_data, fetch_imf_data, fetch_fred_data])

    elif is_ecb:
        active_tools.extend([fetch_ecb_data, fetch_macro_data])

    # Tambah sebelum blok else
    elif any(w in query_lower for w in ['unemployment', 'pengangguran', 'jobless', 'labor force', 'ilo']):
        active_tools.extend([fetch_ilo_unemployment_data, fetch_macro_data])

    else:
        active_tools.extend([fetch_macro_data, fetch_fred_data, fetch_imf_data, fetch_adb_macro_data, fetch_eurostat_macro_data])

    today_date = datetime.now().strftime("%B %d, %Y")
    
    system_instruction = f"""
    You are DataMint's automated routing engine.
    Today's date is {today_date}.

    RULES:
    1. Use exactly ONE function call. Never repeat.
    2. ALWAYS pass start_year and end_year when the user mentions a specific year or range.
    Example: "2025 data" → start_year=2025, end_year=2025
    Example: "2020-2024" → start_year=2020, end_year=2024
    Example: "last 5 years" → start_year={datetime.now().year - 5}, end_year={datetime.now().year}
    3. FORCED MAPPING:
    - Indonesia GDP/macro        → fetch_macro_data(indicator='GDP', country='Indonesia')
    - Indonesia regional/BPS     → fetch_supabase_indicator
    - US GDP/NIPA                → fetch_bea_nipa_data(table_name='T10105')
    - US GDP by industry         → fetch_bea_industry_data(table_id='1')
    - Stock/crypto prices        → fetch_stock_data
    - Cash flow single           → fetch_sec_cashflow(ticker='AAPL', start_year=..., end_year=...)
    - Cash flow multiple         → fetch_sec_cashflow(ticker='AAPL,MSFT,TSLA')
    - FRED series                → fetch_fred_data
    - ECB exchange rate EUR/USD  → fetch_ecb_data(indicator='exchange_rate')
    - Unemployment any country   → fetch_ilo_unemployment_data
    - CPI multi-country          → fetch_imf_data(indicator_code='CPI')
    - OECD productivity/health   → fetch_oecd_data
    - General macro any country  → fetch_macro_data
    4. OUTPUT: Return ONLY one function call. Stop immediately after.
    """

    response = None
    if client is not None:
        for model_name in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name, contents=user_query,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        tools=active_tools,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(
                            disable=True  # ← Matikan AFC
                        )
                    )
                )
                
                break
            except Exception as e:
                print(f"DEBUG: Model '{model_name}' call failed: {e}", file=sys.stderr)
                
    if response is None:
        raise RuntimeError("Gemini gagal dieksekusi.")

    # Eksekusi Tool yang Dipilih AI
    tool_map = {f.__name__: f for f in active_tools}
    calls = []

    if hasattr(response, 'function_calls') and response.function_calls:
        calls = response.function_calls
    elif response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'function_call') and part.function_call:
                calls.append(part.function_call)

    if calls:
        print(f"TOTAL CALLS = {len(calls)}", file=sys.stderr)

        for call in calls:
            name = call.name if hasattr(call, 'name') else call.get('name')
            args = call.args if hasattr(call, 'args') else call.get('args', {})

            print(f"TOOL = {name}", file=sys.stderr)
            print(f"ARGS = {args}", file=sys.stderr)

            if name in tool_map:
                try:
                    result = tool_map[name](**dict(args))

                    print(f"RESULT = {result}", file=sys.stderr)

                except Exception as e:
                    print(f"Error Tool {name}: {e}", file=sys.stderr)
    else:
        print("NO FUNCTION CALLS RETURNED", file=sys.stderr)

    data_found = st.session_state.all_dfs
    print(f"DATASETS FOUND = {len(data_found)}", file=sys.stderr)

    for item in data_found:
        print(item["title"], file=sys.stderr)

    data_context = "No direct data acquired."
    if data_found:
        data_context = "\n".join([
            f"Dataset: {item['title']}\n{item['df'].to_string(index=False)}"
            for item in data_found
        ])

    schema_prompt = f"""
    You are DataMint.

    Return ONLY one valid JSON object.

    Do NOT wrap it inside a list.

    Do NOT include markdown or code fences.

    Do NOT explain anything.

    You MUST use ONLY the retrieved dataset below.

    Never fabricate data. Never use scientific notation (e.g. 1.23e+12), always write full numbers.

    Convert the retrieved dataframe into this JSON structure:

    {{
    "title": "",
    "sources": [],
    "metadata": {{}},
    "columns": [],
    "data": []
    }}

    Each row in "data" must be a dict like {{"Year": "2021", "Value": "1186509691086.73"}}.

    User Query:
    {user_query}

    Retrieved Dataset:
    {data_context}
    """

    final_res = None
    for model_name in GEMINI_MODELS:
        try:
            final_res = client.models.generate_content(
                model=model_name, contents=schema_prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            break
        except Exception as e:
            print(f"DEBUG: Final JSON model '{model_name}' failed: {e}", file=sys.stderr)

    if final_res:
        print("===== GEMINI RAW JSON =====", file=sys.stderr)
        print(final_res.text, file=sys.stderr)

    try:
        raw_text = final_res.text if final_res else None
        if not raw_text:
            raise ValueError("Empty response from Gemini")

        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        res_json = json.loads(raw_text)

        if isinstance(res_json, list):
            res_json = res_json[0] if res_json else generate_smart_fallback_data(user_query)

        if not isinstance(res_json, dict):
            raise ValueError("Response bukan dict")

        # Normalisasi scientific notation di nilai data
        if "data" in res_json and isinstance(res_json["data"], list):
            for row in res_json["data"]:
                if isinstance(row, dict):
                    for k, v in row.items():
                        if isinstance(v, str):
                            try:
                                row[k] = float(v) if ('.' in v or 'e' in v.lower()) else int(v)
                            except ValueError:
                                pass

    except Exception as e:
        print(f"DEBUG: Failed to parse Gemini JSON: {e}", file=sys.stderr)
        res_json = generate_smart_fallback_data(user_query)

    if data_found and not data_found[0].get("df").empty:
        res_json = merge_live_dataframe(res_json, data_found[0].get("df"))

    # ===== TAMBAHKAN SEBELUM RETURN =====
    # Clean semua NaN/Infinity sebelum return
    res_json = clean_nan_values(res_json)

    return res_json


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided."}))
        sys.exit(1)

    try:
        # 1. Ambil output query dari agent
        result = run_agent_query(sys.argv[1])
        
        # 2. Bersihkan nilai NaN bawaan dari dataframe/dict
        result = clean_nan_values(result)
        
        # 3. Encoder pengaman untuk mendeteksi tipe data non-standar JSON
        class SafeJSONEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, (pd.Series, pd.DataFrame)):
                    return obj.to_dict()
                if isinstance(obj, float):
                    if math.isnan(obj) or math.isinf(obj):
                        return None
                return super().default(obj)
        
        # 4. Cetak hasil akhir yang sudah dipastikan aman berupa valid JSON
        print(json.dumps(result, cls=SafeJSONEncoder, ensure_ascii=False))
        
    except Exception as e:
        # Jika gagal, lacak baris error-nya secara detail untuk log terminal
        error_trace = traceback.format_exc()
        print(json.dumps({
            "error": f"Gagal: {str(e)}",
            "trace": error_trace
        }), file=sys.stderr)
        sys.exit(1)