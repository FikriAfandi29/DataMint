#!/usr/bin/env python3
import os
import sys
import time
import requests
from dotenv import load_dotenv

# Force load latest environment variables
load_dotenv(override=True)

# CLI Colors
class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    WHITE_ON_RED = "\033[41m\033[37m"

def print_banner():
    print(Color.CYAN + "=" * 90 + Color.RESET)
    print(Color.BOLD + Color.CYAN + "     DATAMINT ECONOMIC RESEARCH SUITE - API INTEGRATION & HEURISTICS AUDIT" + Color.RESET)
    print(Color.CYAN + "=" * 90 + Color.RESET)
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print(f"Python: {sys.version.split()[0]} on {sys.platform}")
    print(f"Environment: Google Cloud Run container verification mode")
    print("-" * 90)

def test_endpoint(name, url, params=None, headers=None, expected_key=None, expected_status=200):
    """Pings an endpoint and measures performance with strict timeouts."""
    status_str = "PENDING"
    latency = "0.00s"
    details = ""
    start_time = time.time()
    
    # Check if a required key is configured
    has_key = "N/A"
    if expected_key:
        api_val = os.getenv(expected_key)
        if not api_val or api_val.strip() == "" or "MY_" in api_val:
            has_key = Color.RED + "MISSING" + Color.RESET
            details = f"Requires {expected_key} in environment"
            return name, url, Color.RED + "AUTH_ERR" + Color.RESET, latency, has_key, details, False
        else:
            has_key = Color.GREEN + "PRESENT" + Color.RESET
            
    try:
        req_headers = headers or {}
        if 'User-Agent' not in req_headers:
            req_headers['User-Agent'] = 'UniversalAgenticDataMiner afandiahmadfikri@gmail.com'
            
        # 8-second strict timeout for verification
        response = requests.get(url, params=params, headers=req_headers, timeout=8)
        elapsed = time.time() - start_time
        latency = f"{elapsed:.2f}s"
        
        status_code = response.status_code
        if status_code == expected_status:
            status_str = Color.GREEN + f"{status_code} OK" + Color.RESET
            details = "Endpoint healthy & ready"
            success = True
        elif status_code == 401 or status_code == 403:
            status_str = Color.YELLOW + f"{status_code} AUTH" + Color.RESET
            details = "Authentication rejected (check API key activity)"
            success = False
        else:
            status_str = Color.RED + f"{status_code} ERR" + Color.RESET
            details = f"Service responded with unexpected code (Target: {expected_status})"
            success = False
            
    except requests.exceptions.Timeout:
        elapsed = time.time() - start_time
        latency = f"{elapsed:.2f}s"
        status_str = Color.RED + "TIMEOUT" + Color.RESET
        details = "Connection timed out after 8.0s threshold"
        success = False
    except requests.exceptions.RequestException as e:
        elapsed = time.time() - start_time
        latency = f"{elapsed:.2f}s"
        status_str = Color.RED + "NET_ERR" + Color.RESET
        details = str(e)[:45]
        success = False

    return name, url, status_str, latency, has_key, details, success

def main():
    print_banner()
    
    # List of endpoints to test
    endpoints = [
        {
            "name": "World Bank Data API",
            "url": "https://api.worldbank.org/v2/country/IDN/indicator/NY.GDP.MKTP.KD.ZG?format=json",
            "expected_key": None
        },
        {
            "name": "Badan Pusat Statistik API",
            "url": "https://webapi.bps.go.id/v1/api/list/model/subject/lang/ind/key/",
            "expected_key": "BPS_API_KEY"
        },
        {
            "name": "IMF DataMapper API",
            "url": "https://www.imf.org/external/datamapper/api/v2/PCPIPCH",
            "expected_key": None
        },
        {
            "name": "FRED Reserve API",
            "url": "https://api.stlouisfed.org/fred/series/observations",
            "params": {"series_id": "GDPC1", "api_key": os.getenv("FRED_API_KEY", "dummy"), "file_type": "json"},
            "expected_key": "FRED_API_KEY"
        },
        {
            "name": "OECD SDMX Public Portal",
            "url": "https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,1.0/.A.GDPHRS..USD_PPP_H.Q.../startPeriod=2023&format=csvfilewithlabels",
            "expected_key": None
        },
        {
            "name": "European Central Bank (ECB)",
            "url": "https://data-api.ecb.europa.eu/service/data/IRS/M.DE.L.L40.CI.0000.EUR.N.Z",
            "headers": {"Accept": "text/csv"},
            "expected_key": None
        },
        {
            "name": "Eurostat Statistics Hub",
            "url": "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/nama_10_gdp/A..B1GQ.FR",
            "params": {"format": "SDMX-CSV", "startPeriod": "2023"},
            "expected_key": None
        },
        {
            "name": "Asian Development Bank (ADB)",
            "url": "https://kidb.adb.org/api/v4/sdmx/data/ADB,PRC_PRI/A..PHI",
            "params": {"format": "sdmx-csv", "startPeriod": "2023"},
            "expected_key": None
        },
        {
            "name": "UN Comtrade Trade Preview",
            "url": "https://comtradeapi.un.org/public/v1/preview/C/A/HS",
            "params": {"reporterCode": "360", "period": "2023"},
            "expected_key": None
        },
        {
            "name": "SEC EDGAR Ticker Index",
            "url": "https://www.sec.gov/files/company_tickers.json",
            "expected_key": None
        },
        {
            "name": "Bureau of Economic Analysis",
            "url": "https://apps.bea.gov/api/data/",
            "params": {"UserID": os.getenv("BEA_API_KEY", "dummy"), "method": "GetDataSetList", "ResultFormat": "json"},
            "expected_key": "BEA_API_KEY"
        },
        {
            "name": "Intl Labour Org (ILO) SDMX",
            "url": "https://sdmx.ilo.org/rest/data/ILO,DF_UNE_DEAP_SEX_AGE_RT,1.0/IDN.A.UNE_DEAP_RT.SEX_T.AGE_YTHADULT_YGE15",
            "headers": {"Accept": "text/csv"},
            "expected_key": None
        },
        {
            "name": "Elsevier ScienceDirect API",
            "url": "https://api.elsevier.com/content/search/scopus",
            "headers": {"X-ELS-APIKey": os.getenv("ELSEVIER_API_KEY", "dummy"), "Accept": "application/json"},
            "params": {"query": "TITLE(inflation)", "count": "1"},
            "expected_key": "ELSEVIER_API_KEY"
        },
        {
            "name": "NASA planetary database",
            "url": "https://ssd-api.jpl.nasa.gov/sbdb.api",
            "params": {"sstr": "Eros", "phys": "1"},
            "expected_key": None
        }
    ]

    total = len(endpoints)
    passed = 0
    failed = 0
    skipped = 0
    total_time = 0.0

    # Header Row
    print(f"{Color.BOLD}{'API SERVICE':<25} | {'STATUS':<15} | {'LATENCY':<10} | {'KEY ENV':<10} | {'REMARKS / DIAGNOSTICS':<35}{Color.RESET}")
    print("-" * 90)

    for ep in endpoints:
        # For BPS API key URL append
        url = ep["url"]
        if ep["expected_key"] == "BPS_API_KEY":
            api_val = os.getenv("BPS_API_KEY")
            if api_val and api_val.strip() != "" and "MY_" not in api_val:
                url += api_val.strip()
            else:
                url += "dummy"

        name, tested_url, status, latency, env_key, info, success = test_endpoint(
            name=ep["name"],
            url=url,
            params=ep.get("params"),
            headers=ep.get("headers"),
            expected_key=ep["expected_key"]
        )
        
        # Calculate compile-time latencies
        if "s" in latency:
            try:
                total_time += float(latency.replace("s", ""))
            except ValueError:
                pass
                
        print(f"{name:<25} | {status:<15} | {latency:<10} | {env_key:<10} | {info:<35}")
        
        if "AUTH_ERR" in status:
            skipped += 1
        elif success:
            passed += 1
        else:
            failed += 1

    print("-" * 90)
    print(Color.BOLD + "DASHBOARD METRICS INTEGRITY SUMMARY:" + Color.RESET)
    print(f"Total Integrations Audited: {total}")
    print(f"  - Active & Online (200 OK): {Color.GREEN}{passed}{Color.RESET}")
    print(f"  - Offline or Throttled:      {Color.RED if failed > 0 else Color.GREEN}{failed}{Color.RESET}")
    print(f"  - Skipped (No Configured Key):{Color.YELLOW}{skipped}{Color.RESET}")
    print(f"Total Audit Execution Time:  {total_time:.2f}s")
    print(Color.CYAN + "=" * 90 + Color.RESET)

if __name__ == "__main__":
    main()
