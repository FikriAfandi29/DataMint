import sys
import subprocess
import os
import socket
from datetime import datetime

GEMINI_MODELS = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]

def mask(v):
    if not v:
        return "NONE"
    return v[:6] + "..."

# Set global timeout to prevent hanging connections
socket.setdefaulttimeout(15)

def auto_install_packages():
    sentinel = "packages_installed.lock"
    if os.path.exists(sentinel):
        return
    required = ["google-genai", "pandas", "requests", "yfinance", "gnews", "fredapi", "wbgapi", "python-dotenv", "lxml", "springernature-api-client"]
    installed = []
    for pkg in required:
        try:
            if pkg == "google-genai":
                from google import genai
            elif pkg == "yfinance":
                import yfinance as yf
            elif pkg == "fredapi":
                from fredapi import Fred
            elif pkg == "gnews":
                from gnews import GNews
            elif pkg == "wbgapi":
                import wbgapi as wb
            elif pkg == "python-dotenv":
                import dotenv
            elif pkg == "springernature-api-client":
                import springernature_api_client
            else:
                __import__(pkg)
        except ImportError:
            installed.append(pkg)
    if installed:
        print(f"Installing missing packages one by one: {installed}...", file=sys.stderr)
        for pkg in installed:
            cmd = [sys.executable, "-m", "pip", "install", "--break-system-packages", pkg]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode != 0:
                cmd_user = [sys.executable, "-m", "pip", "install", "--user", pkg]
                subprocess.run(cmd_user, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        with open(sentinel, "w") as f:
            f.write("done")
    except Exception:
        pass

print("AUTO INSTALL DISABLED", file=sys.stderr)

# --- MOCK CLASSES (FALLBACK SYSTEM) ---
class MockSessionState(object):
    def __init__(self):
        self.all_dfs = []

class MockStreamlit(object):
    def __init__(self):
        self.session_state = MockSessionState()

st = MockStreamlit()

class MockMultiIndex(object): pass

class MockSeries(list):
    def __init__(self, data=None): super().__init__(data or [])
    def astype(self, dtype): return self
    def to_frame(self, name='Value'): return MockDataFrame([{"Date": i, name: v} for i, v in enumerate(self)])

class MockDataFrame(object):
    def __init__(self, data=None, *args, **kwargs):
        if data is None: self._data = []
        elif isinstance(data, list): self._data = data
        elif isinstance(data, dict):
            keys = list(data.keys())
            if keys:
                length = max(len(data[k]) if isinstance(data[k], (list, tuple)) else 1 for k in keys)
                self._data = []
                for i in range(length):
                    row = {}
                    for k in keys:
                        v = data[k]
                        row[k] = v[i] if isinstance(v, (list, tuple)) and i < len(v) else v
                    self._data.append(row)
            else: self._data = []
        else: self._data = []
        self.columns = list(self._data[0].keys()) if self._data else []

    @property
    def empty(self): return len(self._data) == 0
    @property
    def shape(self): return (len(self._data), len(self.columns))
    def __len__(self): return len(self._data)
    def copy(self):
        import copy
        return MockDataFrame(copy.deepcopy(self._data))
    def iterrows(self): return [(i, row) for i, row in enumerate(self._data)]
    def reset_index(self, *args, **kwargs): return self
    def to_dict(self, orient='records'): return self._data
    def to_json(self, orient='records', *args, **kwargs):
        import json as json_mod
        return json_mod.dumps(self._data)
    def tail(self, n=5): return MockDataFrame(self._data[-n:])
    def to_string(self, *args, **kwargs):
        import json as json_mod
        return json_mod.dumps(self._data, indent=2)
    def __getitem__(self, item): return MockSeries([row.get(item) for row in self._data])
    def __setitem__(self, key, value):
        if len(self._data) == 0 and isinstance(value, (list, tuple)):
            for v in value: self._data.append({key: v})
        else:
            for i, row in enumerate(self._data):
                row[key] = value[i] if isinstance(value, (list, tuple)) and i < len(value) else value
        if self._data: self.columns = list(self._data[0].keys())

class MockApiTypes(object):
    @staticmethod
    def is_numeric_dtype(series): return any(isinstance(v, (int, float)) for v in series)

class PandasMock(object):
    DataFrame = MockDataFrame
    MultiIndex = MockMultiIndex
    api = type('MockApi', (object,), {'types': MockApiTypes()})()
    
    @staticmethod
    def read_csv(io_obj, *args, **kwargs): return MockDataFrame()
    @staticmethod
    def to_datetime(arg, *args, **kwargs): return arg
    @staticmethod
    def isna(val): return val is None
    @staticmethod
    def concat(dfs, ignore_index=True):
        combined = []
        for df in dfs:
            if hasattr(df, '_data'): combined.extend(df._data)
            elif isinstance(df, list): combined.extend(df)
        return MockDataFrame(combined)

class MockResponse(object):
    def __init__(self, content, status_code):
        self.content = content
        self.text = content.decode('utf-8', errors='ignore') if isinstance(content, bytes) else str(content)
        self.status_code = status_code
    def json(self):
        import json as json_mod
        return json_mod.loads(self.text)

class RequestsMock(object):
    @staticmethod
    def get(url, params=None, headers=None, **kwargs):
        import urllib.request, urllib.parse
        if params: url += '?' + urllib.parse.urlencode(params)
        req = urllib.request.Request(url)
        if headers:
            for k, v in headers.items(): req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=15) as r: return MockResponse(r.read(), r.status)
        except Exception as e:
            return MockResponse(f"Error: {e}".encode(), 500)

class DotEnvMockModule(object): load_dotenv = staticmethod(lambda *a, **k: True)

class MockClient(object):
    def __init__(self, api_key=None): self.models = MockModels(api_key or os.getenv("GEMINI_API_KEY", ""))

class MockModels(object):
    def __init__(self, api_key): self.api_key = api_key
    def generate_content(self, model, contents, config=None, **kwargs): raise Exception("Gemini Mock Hit")

class GenerateContentConfigMock(object):
    def __init__(self, system_instruction=None, tools=None, response_mime_type=None, **kwargs):
        self.system_instruction = system_instruction
        self.tools = tools
        self.response_mime_type = response_mime_type

class YFinanceMock(object):
    @staticmethod
    def download(ticker, *args, **kwargs): return MockDataFrame([{"Date": "2026-01-01", "Close": 150.0}])

class WBMock(object):
    data = type('WBDataMock', (object,), {'DataFrame': staticmethod(lambda *args, **kwargs: MockDataFrame([{"Year": "YR2025", "Value": 5.0}]))})()

class FredMockClient(object):
    def __init__(self, api_key=None): self.api_key = api_key
    def get_series(self, series_id, observation_start=None, observation_end=None): return MockSeries([3.5])

class GNewsMock(object):
    def __init__(self, max_results=10, **kwargs): self.max_results = max_results
    def get_news(self, keyword): return [{"title": f"News about {keyword}", "url": "https://datamint.io"}]

# Load or mock libraries
try: import pandas as pd
except ImportError: pd = sys.modules['pandas'] = PandasMock()

try: import requests
except ImportError: requests = sys.modules['requests'] = RequestsMock()

try: from dotenv import load_dotenv
except ImportError:
    sys.modules['dotenv'] = DotEnvMockModule()
    from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:
    import types as py_types
    google_mod = py_types.ModuleType('google')
    sys.modules['google'] = google_mod
    genai_mod = py_types.ModuleType('google.genai')
    google_mod.genai = genai_mod
    sys.modules['google.genai'] = genai_mod
    genai_mod.Client = MockClient
    types_mod = py_types.ModuleType('google.genai.types')
    types_mod.GenerateContentConfig = GenerateContentConfigMock
    genai_mod.types = types_mod
    sys.modules['google.genai.types'] = types_mod

try: import yfinance as yf
except ImportError: yf = sys.modules['yfinance'] = YFinanceMock()

try: from fredapi import Fred
except ImportError:
    import types as py_types
    fred_mod = py_types.ModuleType('fredapi')
    fred_mod.Fred = FredMockClient
    sys.modules['fredapi'] = fred_mod
    from fredapi import Fred

try: from gnews import GNews
except ImportError:
    import types as py_types
    gnews_mod = py_types.ModuleType('gnews')
    gnews_mod.GNews = GNewsMock
    sys.modules['gnews'] = gnews_mod

try: import wbgapi as wb
except ImportError: wb = sys.modules['wbgapi'] = WBMock()

# Springer
try:
    import springernature_api_client.openaccess as openaccess
    import springernature_api_client.meta as meta
    from springernature_api_client.utils import results_to_dataframe
except ImportError:
    meta = type('MockModule_Springer', (object,), {'MetaAPI': type('MetaAPI', (object,), {'__init__': lambda self, api_key: None, 'search': lambda self, **kwargs: {}})})()
    openaccess = type('MockModule_Springer', (object,), {'OpenAccessAPI': type('OpenAccessAPI', (object,), {'__init__': lambda self, api_key: None, 'search': lambda self, **kwargs: {}})})()
    def results_to_dataframe(*args, **kwargs): return pd.DataFrame()

# API CONFIGURATION
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

API_KEY = os.getenv("GEMINI_API_KEY")
BEA_API_KEY = os.getenv("BEA_API_KEY")
FRED_API_KEY = os.getenv("FRED_API_KEY")
ELSEVIER_API_KEY = os.getenv("ELSEVIER_API_KEY")
NASA_API_KEY = os.getenv("NASA_API_KEY")
BPS_API_KEY = os.getenv("BPS_API_KEY")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

try:
    fred_client = Fred(api_key=FRED_API_KEY) if FRED_API_KEY else None
except Exception as e:
    print(f"Warning: Failed to init FRED client: {e}", file=sys.stderr)
    fred_client = None