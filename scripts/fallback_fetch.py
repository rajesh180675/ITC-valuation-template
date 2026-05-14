import yfinance as yf, json, os

ROOT = r'C:\Users\rajesh\WindsurfAPI\ITC-valuation-template'
OUT_DIR = os.path.join(ROOT, 'scripts', 'expanded')

# Common Indian tickers from existing packs
tickers = ['TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'RELIANCE', 'ITC',
           'HINDUNILVR', 'COALINDIA', 'MARUTI', 'TATAMOTORS', 'BAJAJ-AUTO',
           'HEROMOTOCO', 'BHARTIARTL', 'ONGC', 'ADANIENT', 'ADANIPORTS',
           'GAIL', 'IOC', 'BPCL', 'HINDPETRO', 'DRREDDY', 'LUPIN', 'CIPLA',
           'SUNPHARMA', 'BIOCON', 'PIDILITIND', 'ASIANPAINT', 'DABUR', 'NESTLEIND',
           'BRITANNIA', 'DMART', 'ULTRACEMCO', 'ACC', 'AMBUJACEM', 'GRASIM',
           'JSWSTEEL', 'TATASTEEL', 'VEDL', 'HINDALCO', 'GUJGASLTD', 'GAZEBO',
           'INDIGO', 'JETAIRWAYS', 'SPICEJET', 'JUBLFOOD', 'MCDOWELL-N', 'UBL',
           'SHAKTIPUMP', 'SUDARSCHEM', 'RAMCOCEM', 'TRENT', 'VBL', 'WHIRLPOOL',
           'HAVELLS', 'VOLTAS', 'BLUESTARCO']

data = {}

for t in tickers:
    try:
        tk = yf.Ticker(t + '.NS')
        info = tk.info
        data[t] = {
            'name': info['shortName'],
            'sector': info['sector'],
            'mcapCr': round(info['marketCap']/1e7, 2),
        }
    except Exception as e:
        print(f'{t}: ERROR - {e}')

out_path = os.path.join(OUT_DIR, 'fallback_tickers.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f'Saved {len(data)} tickers to {out_path}')