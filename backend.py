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

def send_progress(step: int, message: str):
    print(f"PROGRESS:{step}:{message}", file=sys.stderr, flush=True)

def run_agent_query(user_query: str):
    send_progress(0, "Query parsed — routing engine active")

    try:
        client = genai.Client(vertexai=True, project="gen-lang-client-0971794485", location="us-central1")
    except Exception as e:
        client = None

    st.session_state.all_dfs = []

    # ... semua routing flags dan deduplicate ...

    send_progress(1, f"Sweeping {len(active_tools)} sources — routing tools ready")

    # ... system_instruction, generate_content pertama, tool execution ...

    data_found = st.session_state.all_dfs
    print(f"DATASETS FOUND = {len(data_found)}", file=sys.stderr)

    send_progress(2, f"Data acquired — {len(data_found)} dataset(s) found")

    # ... schema_prompt ...

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

    # ✅ HARUS DI LUAR for loop — 4 spasi, sejajar dengan "final_res = None"
    send_progress(3, "Normalizing data & building JSON schema")

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

    res_json = clean_nan_values(res_json)

    # ✅ HARUS DI LUAR semua try/except — 4 spasi
    send_progress(4, "Building export package — complete")

    return res_json

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

    # Deteksi flag
    is_indonesia    = any(w in query_lower for w in ['indonesia', 'bps', 'bi rate', 'rupiah', 'pdrb', 'idn', 'jawa', 'sumatera', 'kalimantan', 'sulawesi', 'papua', 'banten', 'aceh'])
    is_pdrb         = any(w in query_lower for w in ['pdrb', 'grdp', 'gross regional', 'regional domestic product', 'produk domestik regional'])
    is_gdp          = any(w in query_lower for w in ['gdp', 'pdb', 'gross domestic product'])
    is_stock        = any(w in query_lower for w in ['stock', 'saham', 'share price', 'crypto', 'cash flow', 'sec', 'ticker', 'aapl', 'msft', 'googl', 'amzn', 'nvda', 'meta', 'tsla', 'nasdaq', 'nyse', 'equity'])
    is_academic     = any(w in query_lower for w in ['jurnal', 'paper', 'academic', 'elsevier', 'springer', 'literature', 'research', 'journal', 'publication', 'citation', 'scholarly'])
    is_us           = any(w in query_lower for w in ['bea', 'nipa', 'united states', 'us gdp', 'american economy', 'federal reserve', 'us economy', 'u.s.'])
    is_ecb          = any(w in query_lower for w in ['ecb', 'european central bank', 'eur/usd', 'eurusd', 'euro exchange'])
    is_exchange     = any(w in query_lower for w in ['exchange rate', 'forex', 'currency', 'fx rate', 'usd/', '/usd', 'gbp/', 'jpy/', 'cny/'])
    is_unemployment = any(w in query_lower for w in ['unemployment', 'pengangguran', 'jobless', 'labor force', 'labour force', 'ilo', 'employment rate', 'tpak', 'tpt'])
    is_inflation    = any(w in query_lower for w in ['inflation', 'inflasi', 'cpi', 'consumer price', 'price index', 'ihk'])
    is_productivity = any(w in query_lower for w in ['productivity', 'gdp per hour', 'labor productivity', 'labour productivity', 'tfp', 'total factor'])
    is_health       = any(w in query_lower for w in ['health spending', 'healthcare', 'life expectancy', 'mortality', 'health expenditure'])
    is_trade        = any(w in query_lower for w in ['export', 'import', 'ekspor', 'impor', 'trade balance', 'neraca perdagangan', 'current account'])
    is_industry     = any(w in query_lower for w in ['industry', 'industri', 'sector', 'sektor', 'by industry', 'manufacturing output'])
    is_fred         = any(w in query_lower for w in ['fred', 'federal funds', 'fedfunds', 'treasury', 't-bill', 'libor', 'sofr', 'sp500', 's&p'])
    is_oecd         = any(w in query_lower for w in ['oecd', 'developed countries', 'g7', 'g20 countries'])
    is_imf          = any(w in query_lower for w in ['imf', 'international monetary fund', 'weo', 'world economic outlook'])
    is_commodity    = any(w in query_lower for w in ['oil', 'gold', 'crude', 'commodity', 'brent', 'wti', 'natural gas', 'coal', 'copper'])
    is_population   = any(w in query_lower for w in ['population', 'penduduk', 'demographic', 'birth rate', 'fertility', 'demografi'])
    is_poverty      = any(w in query_lower for w in ['poverty', 'kemiskinan', 'miskin'])
    is_gini         = any(w in query_lower for w in ['gini', 'inequality', 'ketimpangan'])
    is_hdi          = any(w in query_lower for w in ['hdi', 'ipm', 'human development'])
    is_wage         = any(w in query_lower for w in ['wage', 'upah', 'ump', 'umr', 'umk', 'gaji', 'minimum wage', 'upah minimum'])
    is_bps_direct   = any(w in query_lower for w in ['bps', 'statistik indonesia', 'sensus', 'susenas', 'sakernas'])
    is_news         = any(w in query_lower for w in ['news', 'berita', 'headline', 'artikel', 'terbaru'])

    # Flag gabungan untuk BPS dynamic (indikator yang ada di fetch_bps_dynamic_data)
    is_bps_dynamic  = is_poverty or is_gini or is_hdi or is_wage or (is_indonesia and is_unemployment)

    # ============================================================
    # ROUTING BERDASARKAN FLAG
    # ============================================================
    active_tools = []

    if is_stock:
        active_tools.extend([fetch_stock_data, fetch_sec_cashflow, fetch_news_data])

    elif is_academic:
        active_tools.extend([fetch_elsevier_literature, fetch_springer_literature, fetch_nasa_small_body_data])

    elif is_indonesia and is_bps_dynamic:
        # Semua indikator BPS dinamis (HDI, poverty, gini, wage, unemployment)
        # → fetch_bps_dynamic_data sebagai tool utama
        active_tools.extend([fetch_bps_dynamic_data])

    elif is_bps_direct and is_indonesia:
        active_tools.extend([fetch_bps_dynamic_data])

    elif is_indonesia and is_gdp:
        active_tools.extend([fetch_bps_dynamic_data, fetch_macro_data])

    # Di routing Indonesia:
    elif is_indonesia and is_pdrb:
        active_tools.extend([fetch_bps_dynamic_data, fetch_supabase_indicator])

    elif is_indonesia and is_inflation:
        active_tools.extend([fetch_bps_dynamic_data, fetch_macro_data])

    elif is_indonesia:
        active_tools.extend([fetch_supabase_indicator, fetch_macro_data, fetch_bps_data, fetch_bps_dynamic_data, fetch_imf_data])

    elif is_unemployment:
        active_tools.extend([fetch_ilo_unemployment_data, fetch_macro_data])

    elif is_poverty or is_gini:
        # Poverty/Gini non-Indonesia → World Bank
        active_tools.extend([fetch_macro_data, fetch_imf_data])

    elif is_productivity:
        active_tools.extend([fetch_oecd_data, fetch_macro_data])

    elif is_health:
        active_tools.extend([fetch_oecd_data, fetch_macro_data])

    elif is_oecd:
        active_tools.extend([fetch_oecd_data, fetch_macro_data, fetch_imf_data])

    elif is_us and is_industry:
        active_tools.extend([fetch_bea_industry_data, fetch_bea_nipa_data])

    elif is_us:
        active_tools.extend([fetch_bea_nipa_data, fetch_bea_industry_data, fetch_fred_data, fetch_macro_data])

    elif is_fred:
        active_tools.extend([fetch_fred_data, fetch_macro_data])

    elif is_imf and is_inflation:
        active_tools.extend([fetch_imf_data, fetch_macro_data])

    elif is_imf:
        active_tools.extend([fetch_imf_data, fetch_macro_data, fetch_fred_data])

    elif is_ecb:
        active_tools.extend([fetch_ecb_data, fetch_macro_data])

    elif is_exchange:
        active_tools.extend([fetch_ecb_data, fetch_fred_data, fetch_macro_data])

    elif is_trade:
        active_tools.extend([fetch_macro_data, fetch_imf_data, fetch_fred_data])

    elif is_industry:
        active_tools.extend([fetch_macro_data, fetch_oecd_data, fetch_imf_data])

    elif is_inflation:
        active_tools.extend([fetch_imf_data, fetch_macro_data, fetch_fred_data])

    elif is_gdp:
        active_tools.extend([fetch_macro_data, fetch_imf_data, fetch_fred_data])

    elif is_population:
        active_tools.extend([fetch_macro_data, fetch_imf_data])

    elif is_wage:
        active_tools.extend([fetch_macro_data, fetch_ilo_unemployment_data])

    elif is_commodity:
        active_tools.extend([fetch_fred_data, fetch_stock_data])

    elif is_news:
        active_tools.extend([fetch_news_data])

    else:
        active_tools.extend([fetch_macro_data, fetch_fred_data, fetch_imf_data, fetch_adb_macro_data, fetch_eurostat_macro_data])

    # Deduplicate sambil jaga urutan
    seen = set()
    active_tools = [f for f in active_tools if not (f.__name__ in seen or seen.add(f.__name__))]
    

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
    - Indonesia BPS official data → fetch_bps_dynamic_data(indicator='inflation', domain='0000')
    - Indonesia regional BPS      → fetch_bps_dynamic_data(indicator='poverty', region='Jawa Barat')
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
    - Labor productivity / GDP per hour → fetch_oecd_data(indicator='productivity', countries='KOR')
    - GDP per capita (proxy productivity) → fetch_macro_data(indicator='gdp per capita', country='South Korea')
    4. OUTPUT: Return ONLY one function call. Stop immediately after.
    - Stock single column    → fetch_stock_data(ticker="AAPL", columns="close", period="5y")
    - Stock multi close      → fetch_stock_data(ticker="META,AAPL,NVDA", columns="close", start_year=2023)
    - Stock all OHLCV        → fetch_stock_data(ticker="TSLA", period="1y")
    - Stock volume only      → fetch_stock_data(ticker="MSFT", columns="volume", period="2y")
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