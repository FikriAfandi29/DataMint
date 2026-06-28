import os
import io
import re
import requests
import pandas as pd
import yfinance as yf
from gnews import GNews
import wbgapi as wb

# Import dependency khusus dari core kita
from core import st, fred_client, BEA_API_KEY, BPS_API_KEY, ELSEVIER_API_KEY
from core import meta, openaccess, results_to_dataframe

def _filter_by_year(df, year_col, start_year=None, end_year=None, default_tail=10):
    """Helper universal untuk filter tahun di semua miner."""
    if df is None or (hasattr(df, 'empty') and df.empty):
        return df
    try:
        year_series = df[year_col].astype(str).str[:4].astype(int)
        if start_year:
            df = df[year_series >= int(start_year)]
        if end_year:
            df = df[year_series <= int(end_year)]
        if not start_year and not end_year:
            df = df.tail(default_tail)
        return df.reset_index(drop=True)
    except Exception:
        return df.tail(default_tail).reset_index(drop=True)

def fetch_stock_data(ticker: str, start_date: str = None, end_date: str = None, period: str = "1y"):
    try:
        if start_date and end_date:
            data = yf.download(ticker, start=start_date, end=end_date)
        else:
            data = yf.download(ticker, period=period)
        data = data.reset_index()
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = [col[0] for col in data.columns]
            
        st.session_state.all_dfs.append({"title": f"Stock - {ticker}", "df": data})
        recent_data = data.tail(5).to_string()
        return f"Successfully fetched data for {ticker}.\n{recent_data}"
    except Exception as e:
        return f"Failed to fetch stock data for {ticker}. Error: {e}"

def fetch_macro_data(indicator: str, country: str, start_year: int = None, end_year: int = None, recent_years: int = 10):
    import requests
    import pandas as pd
    import sys

    print(f"DEBUG WB API DARI AI -> Target Country: '{country}', Indicator: '{indicator}'", file=sys.stderr)

    # Mapping Indikator
    ind_lower = indicator.lower()
    if 'gdp' in ind_lower and 'growth' not in ind_lower and 'per capita' not in ind_lower:
        wb_indicator = 'NY.GDP.MKTP.CD'
    elif 'growth' in ind_lower:
        wb_indicator = 'NY.GDP.MKTP.KD.ZG'
    elif 'gdp per capita' in ind_lower or 'gdp/capita' in ind_lower:
        wb_indicator = 'NY.GDP.PCAP.CD'
    elif 'inflation' in ind_lower or 'cpi' in ind_lower:
        wb_indicator = 'FP.CPI.TOTL.ZG'
    elif 'unemployment' in ind_lower:
        wb_indicator = 'SL.UEM.TOTL.ZS'
    elif 'fdi' in ind_lower:
        wb_indicator = 'BX.KLT.DINV.WD.GD.ZS'
    elif 'population' in ind_lower:
        wb_indicator = 'SP.POP.TOTL'
    elif 'trade' in ind_lower:
        wb_indicator = 'NE.TRD.GNFS.ZS'
    else:
        wb_indicator = indicator  # gunakan input asli

    # Mapping Negara — support multi-country dengan separator ; atau + atau ,
    country_map = {
        'indonesia': 'IDN', 'idn': 'IDN',
        'united states': 'USA', 'usa': 'USA', 'us': 'USA',
        'china': 'CHN', 'chn': 'CHN',
        'brazil': 'BRA', 'brasil': 'BRA', 'bra': 'BRA',
        'chile': 'CHL', 'chl': 'CHL',
        'colombia': 'COL', 'col': 'COL',
        'india': 'IND', 'ind': 'IND',
        'germany': 'DEU', 'deu': 'DEU',
        'uk': 'GBR', 'united kingdom': 'GBR', 'gbr': 'GBR',
        'japan': 'JPN', 'jpn': 'JPN',
        'south korea': 'KOR', 'korea': 'KOR', 'kor': 'KOR',
        'malaysia': 'MYS', 'mys': 'MYS',
        'thailand': 'THA', 'tha': 'THA',
        'vietnam': 'VNM', 'vnm': 'VNM',
        'philippines': 'PHL', 'phl': 'PHL',
        'singapore': 'SGP', 'sgp': 'SGP',
        'australia': 'AUS', 'aus': 'AUS',
        'france': 'FRA', 'fra': 'FRA',
        'italy': 'ITA', 'ita': 'ITA',
        'spain': 'ESP', 'esp': 'ESP',
        'hungary': 'HUN', 'hun': 'HUN',
        'mexico': 'MEX', 'mex': 'MEX',
        'argentina': 'ARG', 'arg': 'ARG',
        'saudi arabia': 'SAU', 'sau': 'SAU',
        'turkey': 'TUR', 'tur': 'TUR',
        'russia': 'RUS', 'rus': 'RUS',
        'south africa': 'ZAF', 'zaf': 'ZAF',
        'nigeria': 'NGA', 'nga': 'NGA',
        'egypt': 'EGY', 'egy': 'EGY',
    }

    # Parse multi-country input
    raw_countries = [c.strip() for c in country.replace('+', ';').replace(',', ';').split(';') if c.strip()]
    wb_countries = [country_map.get(c.lower(), c.upper()) for c in raw_countries]
    wb_country_str = ';'.join(wb_countries)  # format World Bank: 'IDN;BRA;CHL'

    print(f"DEBUG WB API TERKONVERSI -> Country: '{wb_country_str}', Indicator: '{wb_indicator}'", file=sys.stderr)

    # Build URL
    url = f"https://api.worldbank.org/v2/country/{wb_country_str}/indicator/{wb_indicator}"
    params = {"format": "json", "per_page": 1000}

    if start_year and end_year:
        params["date"] = f"{start_year}:{end_year}"
    elif start_year:
        params["date"] = f"{start_year}:2025"

    try:
        response = requests.get(url, params=params, timeout=15)

        if response.status_code != 200:
            return f"Failed to fetch WB data. HTTP Status: {response.status_code}"

        data = response.json()

        if len(data) < 2 or not data[1]:
            return f"NO DATA returned by World Bank for {wb_country_str} ({wb_indicator})."

        records = data[1]
        df_raw = pd.DataFrame(records)

        # Jika multi-country → pivot (kolom per negara)
        if len(wb_countries) > 1:
            df_raw['country_name'] = df_raw['country'].apply(
                lambda x: x['value'] if isinstance(x, dict) else str(x)
            )
            df_pivot = (
                df_raw[['date', 'country_name', 'value']]
                .dropna(subset=['value'])
                .pivot_table(index='date', columns='country_name', values='value')
                .sort_index()
                .reset_index()
                .rename(columns={'date': 'Year'})
            )
            df_pivot.columns.name = None

            if not start_year:
                df_pivot = df_pivot.tail(recent_years).reset_index(drop=True)

            title = f"World Bank - {wb_country_str} ({wb_indicator})"
            st.session_state.all_dfs.append({"title": title, "df": df_pivot})
            return f"Successfully mined multi-country data.\n{df_pivot.tail(5).to_string(index=False)}"

        # Single country → format lama
        else:
            df = pd.DataFrame(records)
            df_clean = df[['date', 'value']].rename(
                columns={'date': 'Year', 'value': 'Value'}
            ).dropna(subset=['Value'])
            df_clean = df_clean.sort_values('Year').reset_index(drop=True)

            if not start_year:
                df_clean = df_clean.tail(recent_years).reset_index(drop=True)

            if df_clean.empty:
                return "NO DATA after filtering."

            title = f"World Bank - {wb_countries[0]} ({wb_indicator})"
            st.session_state.all_dfs.append({"title": title, "df": df_clean})
            return f"Successfully mined data for {wb_countries[0]}.\n{df_clean.tail(5).to_string(index=False)}"

    except Exception as e:
        error_msg = f"Failed to fetch World Bank data. Error: {e}"
        print(f"DEBUG WB FATAL ERROR: {error_msg}", file=sys.stderr)
        return error_msg

    

def fetch_fred_data(series_id: str, start_date: str = None, end_date: str = None, search_query: str = None):
    import sys
    try:
        if not fred_client:
            return "FRED client is not initialized. Check FRED_API_KEY."

        # Mode search — kalau Gemini tidak tahu series_id yang tepat
        if search_query and not series_id:
            search_results = fred_client.search(search_query)
            if search_results is not None and not search_results.empty:
                top = search_results.head(5)[['title', 'frequency', 'units', 'popularity']].to_string()
                return f"FRED Search Results for '{search_query}':\n{top}"
            return f"No FRED series found for '{search_query}'"

        # Auto-search kalau series_id tidak dikenal (tidak uppercase atau terlalu panjang)
        if series_id and len(series_id) > 20:
            search_results = fred_client.search(series_id)
            if search_results is not None and not search_results.empty:
                series_id = search_results.index[0]
                print(f"DEBUG FRED: Auto-resolved series_id to '{series_id}'", file=sys.stderr)

        print(f"DEBUG FRED: Fetching series '{series_id}', start={start_date}, end={end_date}", file=sys.stderr)

        data = fred_client.get_series(
            series_id,
            observation_start=start_date,
            observation_end=end_date
        )

        if data is None or data.empty:
            return f"FRED returned no data for series '{series_id}'."

        df = data.to_frame(name='Value').reset_index()
        df.columns = ['Date', 'Value']
        df['Date'] = df['Date'].astype(str)
        df = df.dropna(subset=['Value'])

        # Ambil metadata series
        try:
            info = fred_client.get_series_info(series_id)
            title = info.get('title', series_id)
            units = info.get('units_short', '')
            frequency = info.get('frequency_short', '')
        except Exception:
            title = series_id
            units = ''
            frequency = ''

        print(f"DEBUG FRED: Got {len(df)} rows — {title}", file=sys.stderr)

        st.session_state.all_dfs.append({
            "title": f"FRED - {title}",
            "df": df
        })

        return (
            f"Successfully retrieved FRED series '{series_id}': {title}\n"
            f"Units: {units} | Frequency: {frequency} | Rows: {len(df)}\n"
            f"{df.tail(5).to_string(index=False)}"
        )

    except Exception as e:
        print(f"DEBUG FRED ERROR: {e}", file=sys.stderr)
        return f"Failed to fetch FRED data for '{series_id}'. Error: {e}"

def fetch_news_data(keyword: str, max_results: int = 15):
    try:
        google_news = GNews(max_results=max_results)
        news_items = google_news.get_news(keyword)
        if not news_items: return f"Sorry, no news found for the keyword: {keyword}."
        
        df = pd.DataFrame(news_items)
        if 'publisher' in df.columns:
            df['publisher'] = df['publisher'].apply(lambda x: x.get('title') if isinstance(x, dict) else str(x))
        df = df.rename(columns={'title': 'Title', 'published date': 'Published_Date', 'url': 'Link', 'publisher': 'Publisher'})
        
        clean_df = df[[c for c in ['Title', 'Published_Date', 'Link', 'Publisher'] if c in df.columns]].copy()
        st.session_state.all_dfs.append({"title": f"News - {keyword}", "df": clean_df})
        return f"Top headlines about '{keyword}':\n" + "\n- ".join(clean_df['Title'].head(3).tolist())
    except Exception as e:
        return f"Error gathering news: {e}"

def fetch_imf_data(indicator_code: str, country_codes: str, start_year: int = 2020):
    try:
        import sdmx
        import sys

        # Normalisasi country_codes → list ['BRA', 'CHL', 'COL']
        countries = [
            c.strip().upper()
            for c in country_codes.replace('+', '/').replace(',', '/').split('/')
            if c.strip()
        ]

        # Build key sesuai format IMF SDMX
        ind_upper = indicator_code.upper()

        if ind_upper == 'CPI':
            series = '_T.IX.M'
            key = f"{'+'.join(countries)}.CPI.{series}"
            dataset = 'CPI'
            time_format = '%Y-M%m'
        elif ind_upper in ['GDP', 'WEO']:
            series = '_T.NGDP_RPCH.A'
            key = f"{'+'.join(countries)}.WEO.{series}"
            dataset = 'WEO'
            time_format = '%Y'
        else:
            # Generic fallback
            key = f"{'+'.join(countries)}.{ind_upper}"
            dataset = ind_upper
            time_format = '%Y'

        print(f"DEBUG IMF KEY = {key}, DATASET = {dataset}", file=sys.stderr)

        IMF_DATA = sdmx.Client('IMF_DATA')
        data_msg = IMF_DATA.data(dataset, key=key, params={'startPeriod': int(start_year)})

        df = sdmx.to_pandas(data_msg).reset_index()

        if df.empty:
            return f"IMF returned no data for key '{key}'"

        # Pivot: index=TIME_PERIOD, columns=COUNTRY
        time_col = 'TIME_PERIOD'
        country_col = 'COUNTRY' if 'COUNTRY' in df.columns else df.columns[1]
        value_col = 'value' if 'value' in df.columns else df.columns[-1]

        pivot = df.set_index([time_col, country_col])[value_col].unstack()
        pivot.index = pd.to_datetime(pivot.index, format=time_format)
        pivot = pivot.reset_index().rename(columns={time_col: 'Date'})
        pivot.columns.name = None

        st.session_state.all_dfs.append({
            "title": f"IMF {dataset} - {'+'.join(countries)}",
            "df": pivot
        })

        return f"Successfully retrieved IMF {dataset} data.\n{pivot.tail(5).to_string(index=False)}"

    except ImportError:
        return "Error: sdmx1 not installed. Run: pip install sdmx1"
    except Exception as e:
        print(f"DEBUG IMF ERROR: {e}", file=sys.stderr)
        return f"Error fetching IMF data: {str(e)}"

def fetch_ilo_unemployment_data(country_codes: str, start_year: str = "2010", frequency: str = "A", age_group: str = "total"):
    import requests
    import pandas as pd
    import io
    import sys

    # Mapping nama negara → ISO ILO code
    country_map = {
        'indonesia': 'IDN', 'united states': 'USA', 'usa': 'USA',
        'canada': 'CAN', 'uk': 'GBR', 'united kingdom': 'GBR',
        'germany': 'DEU', 'france': 'FRA', 'italy': 'ITA',
        'japan': 'JPN', 'china': 'CHN', 'india': 'IND',
        'brazil': 'BRA', 'australia': 'AUS', 'south korea': 'KOR',
        'korea': 'KOR', 'mexico': 'MEX', 'spain': 'ESP',
        'netherlands': 'NLD', 'sweden': 'SWE', 'norway': 'NOR',
        'denmark': 'DNK', 'finland': 'FIN', 'switzerland': 'CHE',
        'malaysia': 'MYS', 'thailand': 'THA', 'philippines': 'PHL',
        'singapore': 'SGP', 'vietnam': 'VNM', 'turkey': 'TUR',
        'russia': 'RUS', 'south africa': 'ZAF', 'nigeria': 'NGA',
        'egypt': 'EGY', 'argentina': 'ARG', 'chile': 'CHL',
        'colombia': 'COL', 'peru': 'PER',
    }

    # Mapping age group
    age_map = {
        'total': 'AGE_YTHADULT_YGE15',
        'youth': 'AGE_YTHADULT_Y15-24',
        'adult': 'AGE_YTHADULT_YGE25',
        'all': 'AGE_YTHADULT_YGE15+AGE_YTHADULT_Y15-24+AGE_YTHADULT_YGE25',
    }
    age_labels = {
        'AGE_YTHADULT_YGE15': 'Total (15+)',
        'AGE_YTHADULT_Y15-24': 'Youth (15-24)',
        'AGE_YTHADULT_YGE25': 'Adult (25+)',
    }

    # Parse country codes
    raw = [c.strip() for c in country_codes.replace('+', ',').replace(';', ',').split(',') if c.strip()]
    resolved = [country_map.get(c.lower(), c.upper()) for c in raw]
    ilo_countries = '+'.join(resolved)

    # Frequency
    freq = 'M' if frequency.upper() in ['M', 'MONTHLY'] else 'A'

    # Age group
    age_code = age_map.get(age_group.lower(), 'AGE_YTHADULT_YGE15')

    key = f"{ilo_countries}.{freq}.UNE_DEAP_RT.SEX_T.{age_code}"
    url = f"https://sdmx.ilo.org/rest/data/ILO,DF_UNE_DEAP_SEX_AGE_RT,1.0/{key}"
    params = {'startPeriod': str(start_year)}
    headers = {'Accept': 'text/csv'}

    print(f"DEBUG ILO: url={url}, params={params}", file=sys.stderr)

    try:
        response = requests.get(url, params=params, headers=headers, timeout=20)

        if response.status_code != 200:
            return f"ILO API Error: HTTP {response.status_code}"

        df = pd.read_csv(io.StringIO(response.text))

        if df.empty:
            return f"ILO returned no data for countries '{ilo_countries}'"

        print(f"DEBUG ILO: {len(df)} rows, columns: {df.columns.tolist()}", file=sys.stderr)

        # Single country + multiple age groups → pivot by AGE
        if len(resolved) == 1 and 'AGE' in df.columns and age_group.lower() == 'all':
            pivot = df.set_index(['TIME_PERIOD', 'AGE'])['OBS_VALUE'].unstack()
            pivot = pivot.rename(columns=age_labels)
            pivot.index = pd.to_datetime(pivot.index, format='%Y-M%m' if freq == 'M' else '%Y')
            pivot = pivot.sort_index().reset_index().rename(columns={'TIME_PERIOD': 'Date'})
            pivot.columns.name = None
            title = f"ILO Unemployment - {resolved[0]} ({age_group})"

        # Multi-country → pivot by REF_AREA
        elif len(resolved) > 1 and 'REF_AREA' in df.columns:
            pivot = df.set_index(['TIME_PERIOD', 'REF_AREA'])['OBS_VALUE'].unstack()
            pivot = pivot.sort_index().reset_index().rename(columns={'TIME_PERIOD': 'Year'})
            pivot.columns.name = None
            title = f"ILO Unemployment - {ilo_countries}"

        # Single country, single age group
        else:
            time_col = 'TIME_PERIOD' if 'TIME_PERIOD' in df.columns else df.columns[0]
            pivot = df[[time_col, 'OBS_VALUE']].rename(
                columns={time_col: 'Date', 'OBS_VALUE': 'Unemployment Rate (%)'}
            )
            title = f"ILO Unemployment - {resolved[0]}"

        st.session_state.all_dfs.append({"title": title, "df": pivot})

        return (
            f"Successfully retrieved ILO unemployment data for {ilo_countries}.\n"
            f"Frequency: {'Monthly' if freq == 'M' else 'Annual'} | Rows: {len(pivot)}\n"
            f"{pivot.tail(5).to_string(index=False)}"
        )

    except Exception as e:
        print(f"DEBUG ILO ERROR: {e}", file=sys.stderr)
        return f"Error fetching ILO data: {str(e)}"

def fetch_oecd_data(indicator: str, countries: str = "", start_year: str = "2015"):
    import requests
    import pandas as pd
    import io
    import sys

    headers = {'User-Agent': 'DataMint afandiahmadfikri@gmail.com'}

    # Parse countries → format OECD: "USA+GBR+DEU"
    country_map = {
        'indonesia': 'IDN', 'united states': 'USA', 'usa': 'USA',
        'china': 'CHN', 'germany': 'DEU', 'uk': 'GBR',
        'united kingdom': 'GBR', 'france': 'FRA', 'japan': 'JPN',
        'south korea': 'KOR', 'korea': 'KOR', 'australia': 'AUS',
        'canada': 'CAN', 'italy': 'ITA', 'spain': 'ESP',
        'norway': 'NOR', 'sweden': 'SWE', 'denmark': 'DNK',
        'finland': 'FIN', 'switzerland': 'CHE', 'austria': 'AUT',
        'belgium': 'BEL', 'netherlands': 'NLD', 'mexico': 'MEX',
        'turkey': 'TUR', 'brazil': 'BRA', 'india': 'IND',
    }

    if countries:
        raw = [c.strip() for c in countries.replace('+', ',').split(',') if c.strip()]
        country_codes = '+'.join([country_map.get(c.lower(), c.upper()) for c in raw])
    else:
        country_codes = ''  # kosong = semua negara

    # Mapping indikator → URL OECD SDMX
    ind_lower = indicator.lower()

    if 'productivity' in ind_lower or 'gdp per hour' in ind_lower:
        cc = country_codes or 'DNK+FIN+NOR+SWE+USA'
        url = (f'https://sdmx.oecd.org/public/rest/data/'
               f'OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,1.0/'
               f'{cc}.A.GDPHRS..USD_PPP_H.Q...'
               f'?startPeriod={start_year}&format=csvfilewithlabels')
        title = "OECD - GDP per Hour Worked (USD PPP)"
        value_col = 'OBS_VALUE'

    elif 'health' in ind_lower and 'spending' in ind_lower:
        url = (f'https://sdmx.oecd.org/public/rest/data/'
               f'OECD.ELS.HD,DSD_SHA@DF_SHA,1.0/'
               f'.A.EXP_HEALTH.PT_B1GQ._T._Z._T._T._T._Z._Z._Z'
               f'?startPeriod={start_year}&format=csvfilewithlabels')
        title = "OECD - Health Spending (% of GDP)"
        value_col = 'OBS_VALUE'

    elif 'life expectancy' in ind_lower or 'life_expectancy' in ind_lower:
        url = (f'https://sdmx.oecd.org/public/rest/data/'
               f'OECD.ELS.HD,DSD_HEALTH_STAT@DF_LE,1.1/'
               f'.A.LFEXP..Y0._T._Z._Z._Z._Z._Z._Z._Z'
               f'?startPeriod={start_year}&format=csvfilewithlabels')
        title = "OECD - Life Expectancy at Birth"
        value_col = 'OBS_VALUE'

    elif 'unemployment' in ind_lower:
        cc = country_codes or ''
        url = (f'https://sdmx.oecd.org/public/rest/data/'
               f'OECD.ELS.SAE,DSD_LFS@DF_IALFS_UNE_M,1.0/'
               f'{cc}.M.UNE_LF._T.Y_GE15.._Z.STSA'
               f'?startPeriod={start_year}&format=csvfilewithlabels')
        title = "OECD - Unemployment Rate"
        value_col = 'OBS_VALUE'

    elif 'cpi' in ind_lower or 'inflation' in ind_lower:
        cc = country_codes or ''
        url = (f'https://sdmx.oecd.org/public/rest/data/'
               f'OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/'
               f'{cc}.A.CPI.PA._T.N.GY'
               f'?startPeriod={start_year}&format=csvfilewithlabels')
        title = "OECD - CPI Inflation"
        value_col = 'OBS_VALUE'

    else:
        return f"Indicator '{indicator}' not recognized. Available: productivity, health_spending, life_expectancy, unemployment, inflation/cpi"

    print(f"DEBUG OECD URL: {url}", file=sys.stderr)

    try:
        response = requests.get(url, headers=headers, timeout=20)

        if response.status_code != 200:
            return f"OECD API Error: HTTP {response.status_code}"

        df = pd.read_csv(io.StringIO(response.text))

        if df.empty or value_col not in df.columns:
            return f"OECD returned empty data for '{indicator}'"

        print(f"DEBUG OECD: {len(df)} rows, columns: {df.columns.tolist()}", file=sys.stderr)

        # Ambil kolom nama negara kalau ada
        country_label = 'Reference area' if 'Reference area' in df.columns else 'REF_AREA'

        # Pivot: index=TIME_PERIOD, columns=negara
        if country_label in df.columns:
            pivot = (
                df.set_index([country_label, 'TIME_PERIOD'])[value_col]
                .unstack(level=0)
                .sort_index()
                .reset_index()
                .rename(columns={'TIME_PERIOD': 'Year'})
            )
            pivot.columns.name = None
        else:
            pivot = df[['TIME_PERIOD', value_col]].rename(
                columns={'TIME_PERIOD': 'Year', value_col: 'Value'}
            )

        st.session_state.all_dfs.append({"title": title, "df": pivot})

        return (
            f"Successfully fetched {title} from {start_year}.\n"
            f"Countries: {df[country_label].nunique() if country_label in df.columns else 'N/A'}\n"
            f"{pivot.tail(3).to_string(index=False)}"
        )

    except Exception as e:
        print(f"DEBUG OECD ERROR: {e}", file=sys.stderr)
        return f"Error fetching OECD data: {str(e)}"

def fetch_ecb_data(indicator: str, start_year: str = "2015"):
    import requests
    import pandas as pd
    import io

    base_url = 'https://data-api.ecb.europa.eu/service/data/'

    # Normalisasi input dari Gemini
    ind_norm = indicator.lower().replace('/', '').replace(' ', '').replace('-', '')
    if any(x in ind_norm for x in ['eurusd', 'usdeur', 'exchange', 'rate', 'eur', 'usd', 'fx']):
        flow, key, title = 'EXR', 'M.USD.EUR.SP00.A', "ECB - EUR/USD Exchange Rate"
    else:
        return f"Invalid ECB indicator: '{indicator}'. Available: 'exchange_rate', 'EUR/USD', 'eur', 'fx'"

    params = {
        'startPeriod': str(start_year),
        'detail': 'dataonly',
        'format': 'csvdata'
    }

    headers = {'User-Agent': 'UniversalAgenticDataMiner'}

    try:
        response = requests.get(f'{base_url}{flow}/{key}', params=params, headers=headers, timeout=15)

        if response.status_code != 200:
            return f"Failed to retrieve ECB data. HTTP Status: {response.status_code}"

        df = pd.read_csv(io.StringIO(response.text))

        if 'TIME_PERIOD' in df.columns and 'OBS_VALUE' in df.columns:
            clean_df = df[['TIME_PERIOD', 'OBS_VALUE']].rename(columns={'TIME_PERIOD': 'Date', 'OBS_VALUE': 'EUR/USD'})
        else:
            clean_df = df

        st.session_state.all_dfs.append({"title": title, "df": clean_df})

        recent_data = clean_df.tail(3).to_string(index=False)
        return f"Successfully fetched {title} starting from {start_year}.\n{recent_data}"

    except Exception as e:
        return f"Error fetching ECB data: {str(e)}"

def fetch_sec_cashflow(ticker: str, start_year: int = None, end_year: int = None):
    """
    Fetch operating cash flow from SEC EDGAR for one or multiple companies.
    
    ticker:
        Single ticker: "AAPL"
        Multiple tickers (comma-separated): "AAPL,MSFT,TSLA"
        
    start_year: Filter from year (e.g. 2023)
    end_year:   Filter to year (e.g. 2025)
    
    Returns quarterly standalone OCF in Billion USD.
    Always combine multiple tickers in ONE call.
    
    Example:
        fetch_sec_cashflow(ticker="AAPL,MSFT,GOOGL,AMZN,NVDA")
        fetch_sec_cashflow(ticker="MSFT", start_year=2023, end_year=2025)
        fetch_sec_cashflow(ticker="AAPL,TSLA", start_year=2024)
    """
    import requests
    import pandas as pd
    import sys
    import time

    headers = {'User-Agent': 'DataMint afandiahmadfikri@gmail.com'}

    def ytd_to_quarterly(entries):
        df = pd.DataFrame(entries)
        df = df[df['form'].str.startswith('10-')]
        df = (df.sort_values('filed')
                .drop_duplicates(subset=['start', 'end'], keep='last'))
        df['start'] = pd.to_datetime(df['start'])
        df['end'] = pd.to_datetime(df['end'])

        quarters = []
        for start_date, group in df.groupby('start'):
            group = group.sort_values('end')
            prev_end, prev_val = start_date, 0
            for _, row in group.iterrows():
                period_days = (row['end'] - prev_end).days
                if 60 <= period_days <= 120:
                    midpoint = prev_end + (row['end'] - prev_end) / 2
                    quarters.append({
                        'quarter': midpoint.to_period('Q'),
                        'val': row['val'] - prev_val
                    })
                prev_end = row['end']
                prev_val = row['val']

        result = pd.DataFrame(quarters)
        if result.empty:
            return pd.Series(dtype=float)
        return (result.sort_values('quarter')
                      .drop_duplicates(subset='quarter', keep='last')
                      .set_index('quarter')['val'])

    def get_quarterly_ocf(cik):
        url = f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json'
        r = requests.get(url, headers=headers, timeout=15)
        gaap = r.json()['facts']['us-gaap']
        for tag in ['NetCashProvidedByUsedInOperatingActivities',
                    'NetCashProvidedByOperatingActivities']:
            if tag in gaap:
                return ytd_to_quarterly(gaap[tag]['units']['USD'])
        return pd.Series(dtype=float)

    def filter_by_year(df, period_col='Period'):
        """Filter DataFrame berdasarkan start_year dan end_year."""
        if start_year:
            df = df[df[period_col].astype(str).str[:4].astype(int) >= int(start_year)]
        if end_year:
            df = df[df[period_col].astype(str).str[:4].astype(int) <= int(end_year)]
        return df.reset_index(drop=True)

    try:
        tickers_url = 'https://www.sec.gov/files/company_tickers.json'
        tickers_dict = requests.get(tickers_url, headers=headers, timeout=10).json()
        ticker_to_cik = {v['ticker']: str(v['cik_str']).zfill(10) for v in tickers_dict.values()}

        raw_tickers = [t.strip().upper() for t in ticker.replace('+', ',').split(',') if t.strip()]

        not_found = [t for t in raw_tickers if t not in ticker_to_cik]
        if not_found:
            return f"Ticker(s) not found in SEC: {', '.join(not_found)}"

        # Single ticker
        if len(raw_tickers) == 1:
            t = raw_tickers[0]
            cik = ticker_to_cik[t]
            ocf = get_quarterly_ocf(cik)

            if ocf.empty:
                return f"No OCF data found for {t}"

            df_q = ocf.to_frame(name='OCF (Billion USD)')
            df_q.index = df_q.index.astype(str)
            df_q['OCF (Billion USD)'] = (df_q['OCF (Billion USD)'] / 1e9).round(2)
            df_q = df_q.reset_index().rename(columns={'quarter': 'Period'})

            # Filter tahun kalau ada, otherwise 12 kuartal terakhir
            if start_year or end_year:
                df_q = filter_by_year(df_q)
            else:
                df_q = df_q.tail(12).reset_index(drop=True)

            if df_q.empty:
                return f"No data found for {t} in year range {start_year}-{end_year}"

            st.session_state.all_dfs.append({"title": f"SEC EDGAR - {t}", "df": df_q})

            return (
                f"Successfully extracted quarterly OCF for {t}.\n"
                f"Period: {df_q['Period'].iloc[0]} to {df_q['Period'].iloc[-1]}\n"
                f"{df_q.tail(4).to_string(index=False)}"
            )

        # Multi-ticker
        ocf_all = {}
        for t in raw_tickers:
            cik = ticker_to_cik[t]
            ocf_all[t] = get_quarterly_ocf(cik)
            print(f"DEBUG SEC: {t} → {len(ocf_all[t])} quarters", file=sys.stderr)
            time.sleep(0.15)

        df_multi = pd.DataFrame(ocf_all).dropna()

        if df_multi.empty:
            return "No overlapping quarterly data found across tickers."

        df_multi = (df_multi / 1e9).round(2)
        df_multi.index = df_multi.index.astype(str)
        df_multi = df_multi.reset_index().rename(columns={'quarter': 'Period'})

        # Filter tahun kalau ada, otherwise 12 kuartal terakhir
        if start_year or end_year:
            df_multi = filter_by_year(df_multi)
        else:
            df_multi = df_multi.tail(12).reset_index(drop=True)

        if df_multi.empty:
            return f"No data found for {', '.join(raw_tickers)} in year range {start_year}-{end_year}"

        title = f"SEC EDGAR - {', '.join(raw_tickers)}"
        st.session_state.all_dfs.append({"title": title, "df": df_multi})

        return (
            f"Successfully extracted quarterly OCF for {', '.join(raw_tickers)}.\n"
            f"Period: {df_multi['Period'].iloc[0]} to {df_multi['Period'].iloc[-1]}\n"
            f"{df_multi.tail(4).to_string(index=False)}"
        )

    except Exception as e:
        print(f"DEBUG SEC ERROR: {e}", file=sys.stderr)
        return f"Error extracting SEC data: {e}"

def fetch_un_comtrade_data(reporter_m49: str, partner_m49: str, flow_code: str, period: str, cmd_code: str = "TOTAL"):
    # Endpoint UN Comtrade
    pass

def fetch_bea_nipa_data(table_name: str, frequency: str = "Q", year: str = "ALL"):
    import requests
    import pandas as pd
    import sys

    if not BEA_API_KEY:
        return "Error: BEA_API_KEY missing."

    # Normalisasi table_name — Gemini kadang kirim format berbeda
    # Contoh: "2.3.6" → "T20306", "T20306" → "T20306"
    def normalize_table(t: str) -> str:
        t = t.strip().upper()
        if t.startswith('T') and t[1:].isdigit():
            return t  # sudah benar
        # Format "2.3.6" → "T20306"
        parts = t.replace('TABLE', '').strip().split('.')
        if len(parts) >= 2:
            major = parts[0].zfill(1)
            minor = ''.join(parts[1:]).zfill(4)
            return f"T{major}0{minor}"
        return t

    table_name = normalize_table(table_name)
    print(f"DEBUG BEA: table={table_name}, freq={frequency}, year={year}", file=sys.stderr)

    base_url = "https://apps.bea.gov/api/data/"

    params = {
        "UserID": BEA_API_KEY,
        "method": "GetData",
        "datasetname": "NIPA",
        "TableName": table_name,
        "Frequency": frequency,
        "Year": year,
        "ResultFormat": "json"
    }

    # Table NIPA yang valid dan umum dipakai
    VALID_NIPA_TABLES = {
        # GDP
        'gdp': 'T10105',
        'real gdp': 'T10106',
        'gdp growth': 'T10101',
        # PCE
        'consumer spending': 'T20306',
        'pce': 'T20306',
        # Income
        'personal income': 'T20100',
        # Government
        'government spending': 'T30100',
        # Trade
        'net exports': 'T40100',
        # Investment
        'investment': 'T50300',
    }

    def normalize_table(t: str) -> str:
        t_lower = t.lower().strip()
        # Cek apakah ada di alias
        if t_lower in VALID_NIPA_TABLES:
            return VALID_NIPA_TABLES[t_lower]
        t = t.strip().upper()
        # Sudah format benar: T10105
        if t.startswith('T') and len(t) <= 8:
            return t
        # Format "1.1.5" → "T10105"
        parts = t.replace('TABLE', '').strip().split('.')
        if len(parts) >= 2:
            return f"T{''.join(p.zfill(1) for p in parts).zfill(5)}"
        return t

    try:
        response = requests.get(base_url, params=params, timeout=15)

        if response.status_code != 200:
            return f"BEA API Error: HTTP {response.status_code}"

        data = response.json()
        results = data.get('BEAAPI', {}).get('Results', {})

        # Handle both NIPA and GDPbyIndustry response structures
        if isinstance(results, list):
            raw_data = results[0].get('Data', [])
        elif 'Data' in results:
            raw_data = results['Data']
        else:
            err = results.get('Error', {})
            return f"BEA API returned no data. Message: {err.get('APIErrorDescription', 'Unknown error')}"

        if not raw_data:
            return f"BEA: No data found for table '{table_name}'"

        df = pd.DataFrame(raw_data)

        print(f"DEBUG BEA: columns = {df.columns.tolist()}", file=sys.stderr)

        # Bersihkan nilai — hapus koma, konversi ke float
        df['Value'] = pd.to_numeric(
            df['DataValue'].str.replace(',', '', regex=False),
            errors='coerce'
        )

        # Pivot: index=TimePeriod, columns=LineDescription
        if 'LineDescription' in df.columns and 'TimePeriod' in df.columns:
            pivot_df = (
                df.pivot_table(
                    index='TimePeriod',
                    columns='LineDescription',
                    values='Value',
                    aggfunc='first'
                )
                .reset_index()
                .rename(columns={'TimePeriod': 'Period'})
            )
            pivot_df.columns.name = None
        else:
            pivot_df = df

        # Filter tahun jika diminta
        if year != "ALL":
            years_requested = [y.strip() for y in str(year).split(',')]
            pivot_df = pivot_df[
                pivot_df['Period'].astype(str).str[:4].isin(years_requested)
            ]

        if pivot_df.empty:
            return f"BEA: Data empty after filtering for table '{table_name}'"

        print(f"DEBUG BEA: {len(pivot_df)} rows fetched", file=sys.stderr)

        st.session_state.all_dfs.append({
            "title": f"BEA NIPA - {table_name}",
            "df": pivot_df
        })

        return (
            f"Successfully fetched BEA Table {table_name} ({frequency}).\n"
            f"Columns: {pivot_df.columns.tolist()}\n"
            f"{pivot_df.tail(3).to_string(index=False)}"
        )

    except Exception as e:
        print(f"DEBUG BEA ERROR: {e}", file=sys.stderr)
        return f"Error fetching BEA data: {str(e)}"

def fetch_bea_industry_data(industry_code: str = "ALL", table_id: str = "1", frequency: str = "A", year: str = "ALL"):
    """
    Fetch GDP by Industry data from BEA GDPbyIndustry dataset.
    
    table_id options:
    - "1"  = Value Added by Industry
    - "5"  = Value Added as % of GDP
    - "6"  = Components of Value Added
    - "25" = Gross Output by Industry
    """
    import requests
    import pandas as pd
    import sys

    if not BEA_API_KEY:
        return "Error: BEA_API_KEY missing."

    # Normalisasi industry_code
    ind_map = {
        'all': 'ALL',
        'construction': '23',
        'manufacturing': 'MFG',
        'finance': 'FIRE',
        'tech': 'INFO',
        'information': 'INFO',
        'healthcare': '6',
        'retail': '44RT',
        'agriculture': '11',
        'mining': '21',
        'utilities': '22',
        'transport': '48TW',
    }
    industry_code = ind_map.get(industry_code.lower(), industry_code.upper())

    print(f"DEBUG BEA INDUSTRY: table_id={table_id}, industry={industry_code}, freq={frequency}", file=sys.stderr)

    params = {
        "UserID": BEA_API_KEY,
        "method": "GetData",
        "datasetname": "GDPbyIndustry",
        "TableID": table_id,
        "Industry": industry_code,
        "Frequency": frequency,
        "Year": year,
        "ResultFormat": "json"
    }

    try:
        response = requests.get("https://apps.bea.gov/api/data/", params=params, timeout=15)

        if response.status_code != 200:
            return f"BEA API Error: HTTP {response.status_code}"

        data = response.json()
        results = data.get('BEAAPI', {}).get('Results', {})

        # GDPbyIndustry returns list
        if isinstance(results, list):
            raw_data = results[0].get('Data', [])
        elif 'Data' in results:
            raw_data = results['Data']
        else:
            err = results.get('Error', {})
            return f"BEA GDPbyIndustry: {err.get('APIErrorDescription', 'No data returned')}"

        if not raw_data:
            return f"BEA: No industry data for table_id='{table_id}', industry='{industry_code}'"

        df = pd.DataFrame(raw_data)
        print(f"DEBUG BEA INDUSTRY columns: {df.columns.tolist()}", file=sys.stderr)

        df['Value'] = pd.to_numeric(df['DataValue'].str.replace(',', '', regex=False), errors='coerce')

        # Pivot: index=Year, columns=IndustrYDescription
        if 'IndustrYDescription' in df.columns and 'Year' in df.columns:
            pivot = (
                df.pivot_table(index='Year', columns='IndustrYDescription', values='Value', aggfunc='first')
                .reset_index()
            )
            pivot.columns.name = None
        else:
            pivot = df

        title = f"BEA GDP by Industry - Table {table_id}"
        st.session_state.all_dfs.append({"title": title, "df": pivot})

        return (
            f"Successfully fetched {title}.\n"
            f"Industries: {df['IndustrYDescription'].nunique() if 'IndustrYDescription' in df.columns else 'N/A'}\n"
            f"{pivot.tail(3).to_string(index=False)}"
        )

    except Exception as e:
        print(f"DEBUG BEA INDUSTRY ERROR: {e}", file=sys.stderr)
        return f"Error fetching BEA industry data: {str(e)}"

def fetch_elsevier_literature(search_query: str, limit: int = 25):
    if not ELSEVIER_API_KEY:
        return "Error: ELSEVIER_API_KEY missing."

    search_query = f"TITLE({search_query.replace('TITLE(', '').replace(')', '')})"

    try:
        response = requests.get(
            "https://api.elsevier.com/content/search/scopus",
            headers={
                "X-ELS-APIKey": ELSEVIER_API_KEY,
                "Accept": "application/json"
            },
            params={
                "query": search_query,
                "count": limit
            },
            timeout=10
        )

        response.raise_for_status()

        entries = response.json().get("search-results", {}).get("entry", [])

        if not entries:
            return "No papers found."

        papers = []

        for item in entries:
            doi = item.get("prism:doi")

            papers.append({
                "Title": item.get("dc:title", ""),
                "Authors": item.get("dc:creator", ""),
                "Journal": item.get("prism:publicationName", ""),
                "DOI": doi if doi else "",
                "DOI Link": f"https://doi.org/{doi}" if doi else "",
                "Cited By": item.get("citedby-count", "0"),
                "Document Type": item.get("subtypeDescription", ""),
            })

        df = pd.DataFrame(papers)

        st.session_state.all_dfs.append({
            "title": f"Elsevier - {search_query[:30]}",
            "df": df
        })

        return (
            f"Successfully retrieved {len(df)} papers from Elsevier Scopus.\n"
            f"{df.head().to_string(index=False)}"
        )

    except Exception as e:
        return f"Error fetching Elsevier literature: {e}"

def fetch_adb_macro_data(country_code: str, category: str): pass
def fetch_eurostat_macro_data(country_code: str, category: str, start_year: str = "2023"): pass
def fetch_springer_literature(keyword: str): pass
def fetch_nasa_small_body_data(object_name: str): pass

def fetch_supabase_indicator(
    indicator: str,
    source: str = None,
    country: str = None,
    region: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 1000,
):
    """
    Retrieve official economic statistics stored in the DataMint Supabase database.

    Primary source:
    - Statistics Indonesia (BPS)
    - Bank Indonesia (BI)
    - Ministry of Finance
    - Internal DataMint datasets

    Typical indicators:

    National
    - GDP
    - Inflation
    - Population
    - Poverty
    - Exchange Rate
    - BI_RATE (Bank Indonesia interest rate)

    Regional
    - PDRB
    - GRDP
    - Regional Inflation
    - Regional Poverty
    - HDI (IPM)
    - Gini Ratio
    - Open Unemployment Rate
    - Labor Force
    - Exports
    - Imports

    Arguments

    indicator:
        Name of indicator. Use exact or partial match.
        Example: "BI_RATE", "PDRB", "Inflation", "HDI"

    source:
        Data provider. Example: "BI", "BPS"

    country:
        Example: "Indonesia"

    region:
        Province or district.
        Example: "Jawa Barat", "Banten", "DKI Jakarta", "Kabupaten Bogor"

    start_date / end_date:
        ISO format: "2020-01-01"

    Use this function whenever the user requests Indonesian statistics,
    BI Rate, BPS data, or regional economic indicators.
    """
    import sys

    try:
        from core import supabase

        # Normalisasi indicator — Gemini kadang kirim nama berbeda
        # Normalisasi indicator — mapping ke nama EXACT di Supabase
        indicator_map = {
            # BI Rate
            'bi rate': 'BI_RATE',
            'bi_rate': 'BI_RATE',
            'suku bunga': 'BI_RATE',
            'interest rate': 'BI_RATE',
            'policy rate': 'BI_RATE',

            # Inflation
            'inflasi': 'INFLATION',
            'inflation': 'INFLATION',
            'cpi': 'INFLATION',
            'harga': 'INFLATION',

            # GDP
            'gdp': 'GDP_CURRENT_PRICE',
            'pdb': 'GDP_CURRENT_PRICE',
            'gross domestic product': 'GDP_CURRENT_PRICE',
            'gdp current': 'GDP_CURRENT_PRICE',
            'gdp current price': 'GDP_CURRENT_PRICE',

            # Unemployment
            'unemployment': 'UNEMPLOYMENT_RATE_AUG',
            'pengangguran': 'UNEMPLOYMENT_RATE_AUG',
            'unemployment rate': 'UNEMPLOYMENT_RATE_AUG',
            'unemployment aug': 'UNEMPLOYMENT_RATE_AUG',
            'unemployment feb': 'UNEMPLOYMENT_RATE_FEB',

            # Poverty
            'poverty': 'POVERTY_RATE_TOTAL',
            'kemiskinan': 'POVERTY_RATE_TOTAL',
            'poverty rate': 'POVERTY_RATE_TOTAL',
            'poverty urban': 'POVERTY_RATE_URBAN',
            'poverty rural': 'POVERTY_RATE_RURAL',
            'kemiskinan kota': 'POVERTY_RATE_URBAN',
            'kemiskinan desa': 'POVERTY_RATE_RURAL',

            # Gini
            'gini': 'GINI_RATIO_TOTAL',
            'gini ratio': 'GINI_RATIO_TOTAL',
            'gini total': 'GINI_RATIO_TOTAL',
            'gini urban': 'GINI_RATIO_URBAN',
            'gini rural': 'GINI_RATIO_RURAL',
            'inequality': 'GINI_RATIO_TOTAL',
            'ketimpangan': 'GINI_RATIO_TOTAL',

            # HDI
            'hdi': 'HDI',
            'ipm': 'HDI',
            'human development': 'HDI',
            'indeks pembangunan manusia': 'HDI',

            # Labor Force
            'lfpr': 'LFPR_AUG',
            'labor force': 'LFPR_AUG',
            'tenaga kerja': 'LFPR_AUG',
            'partisipasi angkatan kerja': 'LFPR_AUG',
            'lfpr aug': 'LFPR_AUG',
            'lfpr feb': 'LFPR_FEB',

            # Minimum Wage
            'minimum wage': 'MINIMUM_WAGE',
            'upah minimum': 'MINIMUM_WAGE',
            'umr': 'MINIMUM_WAGE',
            'umk': 'MINIMUM_WAGE',
            'upah': 'MINIMUM_WAGE',
        }

        # Normalisasi region — mapping ke format di Supabase
        region_map = {
            'aceh': 'Aceh',
            'sumatera utara': 'Sumatera Utara',
            'sumut': 'Sumatera Utara',
            'sumatera barat': 'Sumatera Barat',
            'sumbar': 'Sumatera Barat',
            'riau': 'Riau',
            'jambi': 'Jambi',
            'sumatera selatan': 'Sumatera Selatan',
            'sumsel': 'Sumatera Selatan',
            'bengkulu': 'Bengkulu',
            'lampung': 'Lampung',
            'kepulauan bangka belitung': 'Kepulauan Bangka Belitung',
            'babel': 'Kepulauan Bangka Belitung',
            'bangka belitung': 'Kepulauan Bangka Belitung',
            'kepulauan riau': 'Kepulauan Riau',
            'kepri': 'Kepulauan Riau',
            'dki jakarta': 'DKI Jakarta',
            'jakarta': 'DKI Jakarta',
            'jawa barat': 'Jawa Barat',
            'jabar': 'Jawa Barat',
            'jawa tengah': 'Jawa Tengah',
            'jateng': 'Jawa Tengah',
            'di yogyakarta': 'DI Yogyakarta',
            'yogyakarta': 'DI Yogyakarta',
            'jogja': 'DI Yogyakarta',
            'diy': 'DI Yogyakarta',
            'jawa timur': 'Jawa Timur',
            'jatim': 'Jawa Timur',
            'banten': 'Banten',
            'bali': 'Bali',
            'nusa tenggara barat': 'Nusa Tenggara Barat',
            'ntb': 'Nusa Tenggara Barat',
            'nusa tenggara timur': 'Nusa Tenggara Timur',
            'ntt': 'Nusa Tenggara Timur',
            'kalimantan barat': 'Kalimantan Barat',
            'kalbar': 'Kalimantan Barat',
            'kalimantan tengah': 'Kalimantan Tengah',
            'kalteng': 'Kalimantan Tengah',
            'kalimantan selatan': 'Kalimantan Selatan',
            'kalsel': 'Kalimantan Selatan',
            'kalimantan timur': 'Kalimantan Timur',
            'kaltim': 'Kalimantan Timur',
            'kalimantan utara': 'Kalimantan Utara',
            'kaltara': 'Kalimantan Utara',
            'sulawesi utara': 'Sulawesi Utara',
            'sulut': 'Sulawesi Utara',
            'sulawesi tengah': 'Sulawesi Tengah',
            'sulteng': 'Sulawesi Tengah',
            'sulawesi selatan': 'Sulawesi Selatan',
            'sulsel': 'Sulawesi Selatan',
            'sulawesi tenggara': 'Sulawesi Tenggara',
            'sultra': 'Sulawesi Tenggara',
            'gorontalo': 'Gorontalo',
            'sulawesi barat': 'Sulawesi Barat',
            'sulbar': 'Sulawesi Barat',
            'maluku': 'Maluku',
            'maluku utara': 'Maluku Utara',
            'papua barat': 'Papua Barat',
            'papua barat daya': 'Papua Barat Daya',
            'papua': 'Papua',
            'papua selatan': 'Papua Selatan',
            'papua tengah': 'Papua Tengah',
            'papua pegunungan': 'Papua Pegunungan',
            'indonesia': 'Indonesia',
        }
        indicator_normalized = indicator_map.get(indicator.lower().strip(), indicator)
        region_normalized = region_map.get(region.lower().strip(), region) if region else None

        print(f"DEBUG SUPABASE: indicator='{indicator_normalized}', source='{source}', country='{country}', region='{region}'", file=sys.stderr)

        query = supabase.table("economic_indicators").select("*")

        if source:
            query = query.ilike("source", f"%{source}%")
        if indicator_normalized:
            query = query.ilike("indicator", f"%{indicator_normalized}%")
        if country:
            query = query.ilike("country", f"%{country}%")
        if region:
            query = query.ilike("region", f"%{region}%")
        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)

        query = query.order("date", desc=True).limit(limit)
        result = query.execute()

        if not result.data:
            # Coba fallback tanpa filter source
            print(f"DEBUG SUPABASE: No data, retrying without source filter", file=sys.stderr)
            query2 = supabase.table("economic_indicators").select("*")
            if indicator_normalized:
                query = query.ilike("indicator", f"%{indicator_normalized}%")
            if region_normalized:
                query = query.ilike("region", f"%{region_normalized}%")
            query2 = query2.order("date", desc=True).limit(limit)
            result = query2.execute()

        if not result.data:
            return (
                f"No data found in Supabase.\n"
                f"Indicator : {indicator_normalized}\n"
                f"Source    : {source}\n"
                f"Country   : {country}\n"
                f"Region    : {region}\n"
                f"Tip: Try fetch_macro_data or fetch_fred_data instead."
            )

        df = pd.DataFrame(result.data)

        # Drop kolom tidak perlu
        df = df.drop(columns=[c for c in ["id", "created_at"] if c in df.columns], errors="ignore")

        # Urutkan kolom
        preferred = ["date", "country", "region", "indicator", "value", "unit", "source"]
        existing = [c for c in preferred if c in df.columns]
        remaining = [c for c in df.columns if c not in existing]
        df = df[existing + remaining]

        # Sort ascending untuk chart
        df = df.sort_values("date").reset_index(drop=True)

        title = f"{indicator_normalized}" + (f" - {region}" if region else "") + (f" ({source})" if source else "")

        st.session_state.all_dfs.append({"title": title, "df": df})

        print("========== SUPABASE RESULT ==========", file=sys.stderr)
        print(df.head(10).to_string(), file=sys.stderr)
        print(f"Shape: {df.shape}", file=sys.stderr)
        print("=====================================", file=sys.stderr)

        return (
            f"Successfully loaded {len(df)} observations from Supabase.\n"
            f"Indicator: {indicator_normalized} | Source: {df['source'].iloc[0] if 'source' in df.columns else 'N/A'}\n\n"
            f"{df.tail(10).to_string(index=False)}"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"Supabase Error: {e}"