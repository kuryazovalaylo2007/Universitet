from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime, timedelta
import random

app = Flask(__name__, static_folder='../frontend/static', template_folder='../frontend/templates')
CORS(app)

# ===================== MA'LUMOTLAR GENERATSIYASI =====================

def generate_sample_data():
    """Demo ma'lumotlar yaratish"""
    random.seed(42)
    np.random.seed(42)

    fanlar = ['Matematika', 'Fizika', 'Kimyo', 'Informatika', 'Ingliz tili',
              'Tarix', 'Biologiya', 'Iqtisodiyot', 'Dasturlash', 'Ma\'lumotlar bazasi']

    guruhlar = ['CS-101', 'CS-102', 'IT-101', 'IT-102', 'EE-101']

    talabalar = []
    for i in range(1, 51):
        guruh = random.choice(guruhlar)
        talaba = {
            'id': i,
            'ism': f'Talaba {i}',
            'guruh': guruh,
            'email': f'talaba{i}@university.uz',
        }
        talabalar.append(talaba)

    # Baholar
    baholar = []
    baho_id = 1
    for talaba in talabalar:
        for fan in random.sample(fanlar, random.randint(4, 7)):
            for semestr in [1, 2]:
                baho = {
                    'id': baho_id,
                    'talaba_id': talaba['id'],
                    'fan': fan,
                    'semestr': semestr,
                    'oraliq': round(random.uniform(40, 100), 1),
                    'yakuniy': round(random.uniform(40, 100), 1),
                    'amaliy': round(random.uniform(40, 100), 1),
                }
                baho['jami'] = round((baho['oraliq'] * 0.3 + baho['yakuniy'] * 0.5 + baho['amaliy'] * 0.2), 1)
                if baho['jami'] >= 86:
                    baho['harf'] = 'A'
                elif baho['jami'] >= 71:
                    baho['harf'] = 'B'
                elif baho['jami'] >= 56:
                    baho['harf'] = 'C'
                elif baho['jami'] >= 40:
                    baho['harf'] = 'D'
                else:
                    baho['harf'] = 'F'
                baholar.append(baho)
                baho_id += 1

    # Davomat
    davomat = []
    bugun = datetime.now()
    davomat_id = 1
    for talaba in talabalar:
        for fan in random.sample(fanlar, random.randint(3, 5)):
            for hafta in range(1, 17):
                sana = bugun - timedelta(weeks=16 - hafta)
                keldi = random.random() > 0.15
                davomat.append({
                    'id': davomat_id,
                    'talaba_id': talaba['id'],
                    'fan': fan,
                    'sana': sana.strftime('%Y-%m-%d'),
                    'holat': 'keldi' if keldi else 'kelmadi',
                    'hafta': hafta
                })
                davomat_id += 1

    return talabalar, baholar, davomat

# Global ma'lumotlar
TALABALAR, BAHOLAR, DAVOMAT = generate_sample_data()

def get_df():
    df_talabalar = pd.DataFrame(TALABALAR)
    df_baholar = pd.DataFrame(BAHOLAR)
    df_davomat = pd.DataFrame(DAVOMAT)
    return df_talabalar, df_baholar, df_davomat

# ===================== API ENDPOINTS =====================

@app.route('/')
def index():
    return send_from_directory('../frontend/templates', 'index.html')

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    """Asosiy dashboard statistikasi"""
    df_t, df_b, df_d = get_df()

    # Umumiy statistika
    jami_talabalar = len(df_t)
    ortacha_baho = round(df_b['jami'].mean(), 1)

    # Davomat foizi
    jami_dars = len(df_d)
    kelgan = len(df_d[df_d['holat'] == 'keldi'])
    davomat_foiz = round((kelgan / jami_dars) * 100, 1) if jami_dars > 0 else 0

    # A baho olganlar
    a_talabalar = len(df_b[df_b['harf'] == 'A']['talaba_id'].unique())

    # Guruh bo'yicha statistika
    guruh_stat = df_t.merge(df_b, left_on='id', right_on='talaba_id')
    guruh_baho = guruh_stat.groupby('guruh')['jami'].mean().round(1).to_dict()

    # Fan bo'yicha o'rtacha baho
    fan_baho = df_b.groupby('fan')['jami'].mean().round(1).sort_values(ascending=False)
    fan_labels = fan_baho.index.tolist()
    fan_values = fan_baho.values.tolist()

    # Harf baholar taqsimoti
    harf_taqsim = df_b['harf'].value_counts().to_dict()

    # Oylik davomat trendi
    df_d['sana_dt'] = pd.to_datetime(df_d['sana'])
    df_d['oy'] = df_d['sana_dt'].dt.strftime('%Y-%m')
    oylik = df_d.groupby(['oy', 'holat']).size().unstack(fill_value=0)
    oylik['foiz'] = (oylik.get('keldi', 0) / (oylik.get('keldi', 0) + oylik.get('kelmadi', 0)) * 100).round(1)
    oylik_data = oylik['foiz'].tail(6).to_dict()

    return jsonify({
        'umumiy': {
            'jami_talabalar': jami_talabalar,
            'ortacha_baho': ortacha_baho,
            'davomat_foiz': davomat_foiz,
            'a_talabalar': a_talabalar
        },
        'guruh_baho': guruh_baho,
        'fan_baho': {'labels': fan_labels, 'values': fan_values},
        'harf_taqsim': harf_taqsim,
        'oylik_davomat': oylik_data
    })

@app.route('/api/talabalar', methods=['GET'])
def talabalar_royxat():
    """Barcha talabalar ro'yxati"""
    df_t, df_b, df_d = get_df()

    guruh_filter = request.args.get('guruh', '')
    qidiruv = request.args.get('q', '').lower()

    # Talabalar va ularning o'rtacha bahosi
    ortacha = df_b.groupby('talaba_id')['jami'].mean().round(1).reset_index()
    ortacha.columns = ['id', 'ortacha_baho']

    # Davomat foizi
    davomat_stat = df_d.groupby('talaba_id').apply(
        lambda x: round((x['holat'] == 'keldi').sum() / len(x) * 100, 1)
    ).reset_index()
    davomat_stat.columns = ['id', 'davomat_foiz']

    df_merged = df_t.merge(ortacha, on='id', how='left')
    df_merged = df_merged.merge(davomat_stat, on='id', how='left')
    df_merged['ortacha_baho'] = df_merged['ortacha_baho'].fillna(0)
    df_merged['davomat_foiz'] = df_merged['davomat_foiz'].fillna(0)

    if guruh_filter:
        df_merged = df_merged[df_merged['guruh'] == guruh_filter]
    if qidiruv:
        df_merged = df_merged[df_merged['ism'].str.lower().str.contains(qidiruv)]

    result = df_merged.to_dict(orient='records')
    guruhlar = df_t['guruh'].unique().tolist()

    return jsonify({'talabalar': result, 'guruhlar': guruhlar})

@app.route('/api/talaba', methods=['POST'])
def add_talaba():
    """Yangi talaba qo'shish"""
    data = request.json
    global TALABALAR, BAHOLAR, DAVOMAT
    new_id = max([t['id'] for t in TALABALAR], default=0) + 1
    talaba = {
        'id': new_id,
        'ism': data.get('ism', ''),
        'guruh': data.get('guruh', ''),
        'email': data.get('email', '')
    }
    TALABALAR.append(talaba)

    baho_val = float(data.get('baho', 0))
    if baho_val > 0:
        new_baho_id = max([b['id'] for b in BAHOLAR], default=0) + 1
        harf = 'A' if baho_val >= 86 else 'B' if baho_val >= 71 else 'C' if baho_val >= 56 else 'D' if baho_val >= 40 else 'F'
        BAHOLAR.append({
            'id': new_baho_id,
            'talaba_id': new_id,
            'fan': 'Umumiy Fan',
            'semestr': 1,
            'oraliq': baho_val,
            'yakuniy': baho_val,
            'amaliy': baho_val,
            'jami': baho_val,
            'harf': harf
        })

    davomat_val = float(data.get('davomat', 0))
    if davomat_val >= 0:
        new_d_id = max([d['id'] for d in DAVOMAT], default=0) + 1
        # Create 100 records to exactly match percentage easily
        keldi_count = int(davomat_val)
        kelmadi_count = 100 - keldi_count
        bugun = datetime.now()
        for i in range(100):
            holat = 'keldi' if i < keldi_count else 'kelmadi'
            DAVOMAT.append({
                'id': new_d_id + i,
                'talaba_id': new_id,
                'fan': 'Umumiy Fan',
                'sana': bugun.strftime('%Y-%m-%d'),
                'holat': holat,
                'hafta': 1
            })

    return jsonify({'status': 'success', 'talaba': talaba})

@app.route('/api/talaba/<int:talaba_id>', methods=['DELETE'])
def delete_talaba(talaba_id):
    """Talabani o'chirish"""
    global TALABALAR, BAHOLAR, DAVOMAT
    TALABALAR = [t for t in TALABALAR if t['id'] != talaba_id]
    BAHOLAR = [b for b in BAHOLAR if b['talaba_id'] != talaba_id]
    DAVOMAT = [d for d in DAVOMAT if d['talaba_id'] != talaba_id]
    return jsonify({'status': 'success'})

@app.route('/api/talaba/<int:talaba_id>', methods=['GET'])
def talaba_detail(talaba_id):
    """Bitta talabaning to'liq ma'lumoti"""
    df_t, df_b, df_d = get_df()

    talaba = df_t[df_t['id'] == talaba_id].to_dict(orient='records')
    if not talaba:
        return jsonify({'error': 'Talaba topilmadi'}), 404
    talaba = talaba[0]

    # Baholar
    baholar = df_b[df_b['talaba_id'] == talaba_id].to_dict(orient='records')

    # Davomat
    davomat = df_d[df_d['talaba_id'] == talaba_id]
    davomat_foiz = round((davomat['holat'] == 'keldi').sum() / len(davomat) * 100, 1) if len(davomat) > 0 else 0

    # Fan bo'yicha davomat
    fan_davomat = davomat.groupby('fan').apply(
        lambda x: round((x['holat'] == 'keldi').sum() / len(x) * 100, 1)
    ).to_dict()

    return jsonify({
        'talaba': talaba,
        'baholar': baholar,
        'davomat_foiz': davomat_foiz,
        'fan_davomat': fan_davomat
    })

@app.route('/api/baholar/tahlil', methods=['GET'])
def baholar_tahlil():
    """Baholar tahlili"""
    df_t, df_b, df_d = get_df()

    fan_filter = request.args.get('fan', '')
    semestr_filter = request.args.get('semestr', '')

    df = df_b.copy()
    if fan_filter:
        df = df[df['fan'] == fan_filter]
    if semestr_filter:
        df = df[df['semestr'] == int(semestr_filter)]

    # Statistika
    stats = {
        'max': round(float(df['jami'].max()), 1),
        'min': round(float(df['jami'].min()), 1),
        'ortacha': round(float(df['jami'].mean()), 1),
        'median': round(float(df['jami'].median()), 1),
        'std': round(float(df['jami'].std()), 1),
    }

    # Harf taqsimoti
    harf = df['harf'].value_counts().to_dict()

    # Fan bo'yicha o'rtacha
    fan_ortacha = df.groupby('fan')['jami'].mean().round(1).sort_values(ascending=False).to_dict()

    # Semestr taqqoslash
    semestr_stat = df_b.groupby('semestr')['jami'].agg(['mean', 'min', 'max']).round(1).to_dict()

    fanlar = df_b['fan'].unique().tolist()

    return jsonify({
        'stats': stats,
        'harf_taqsim': harf,
        'fan_ortacha': fan_ortacha,
        'semestr_stat': semestr_stat,
        'fanlar': fanlar
    })

@app.route('/api/davomat/tahlil', methods=['GET'])
def davomat_tahlil():
    """Davomat tahlili"""
    df_t, df_b, df_d = get_df()

    # Guruh bo'yicha davomat
    df_merged = df_d.merge(df_t, left_on='talaba_id', right_on='id')
    guruh_davomat = df_merged.groupby('guruh').apply(
        lambda x: round((x['holat'] == 'keldi').sum() / len(x) * 100, 1)
    ).to_dict()

    # Fan bo'yicha davomat
    fan_davomat = df_d.groupby('fan').apply(
        lambda x: round((x['holat'] == 'keldi').sum() / len(x) * 100, 1)
    ).sort_values(ascending=False).to_dict()

    # Haftalik trend
    haftalik = df_d.groupby('hafta').apply(
        lambda x: round((x['holat'] == 'keldi').sum() / len(x) * 100, 1)
    ).to_dict()

    # Xavfli talabalar (davomat < 60%)
    talaba_davomat = df_d.groupby('talaba_id').apply(
        lambda x: round((x['holat'] == 'keldi').sum() / len(x) * 100, 1)
    ).reset_index()
    talaba_davomat.columns = ['talaba_id', 'davomat_foiz']
    xavfli = talaba_davomat[talaba_davomat['davomat_foiz'] < 60]
    xavfli = xavfli.merge(df_t, left_on='talaba_id', right_on='id')[['ism', 'guruh', 'davomat_foiz']]
    xavfli_list = xavfli.sort_values('davomat_foiz').head(10).to_dict(orient='records')

    return jsonify({
        'guruh_davomat': guruh_davomat,
        'fan_davomat': fan_davomat,
        'haftalik_trend': haftalik,
        'xavfli_talabalar': xavfli_list
    })

@app.route('/api/reytinglar', methods=['GET'])
def reytinglar():
    """Top talabalar reytingi"""
    df_t, df_b, df_d = get_df()

    # O'rtacha baho bo'yicha reyting
    ortacha = df_b.groupby('talaba_id')['jami'].mean().round(1).reset_index()
    ortacha.columns = ['id', 'ortacha_baho']

    davomat_stat = df_d.groupby('talaba_id').apply(
        lambda x: round((x['holat'] == 'keldi').sum() / len(x) * 100, 1)
    ).reset_index()
    davomat_stat.columns = ['id', 'davomat_foiz']

    reyting = df_t.merge(ortacha, on='id').merge(davomat_stat, on='id')
    reyting['umumiy_ball'] = (reyting['ortacha_baho'] * 0.7 + reyting['davomat_foiz'] * 0.3).round(1)
    reyting = reyting.sort_values('umumiy_ball', ascending=False).reset_index(drop=True)
    reyting['o\'rin'] = reyting.index + 1

    top10 = reyting.head(10).to_dict(orient='records')
    bottom10 = reyting.tail(10).sort_values('umumiy_ball').to_dict(orient='records')

    return jsonify({
        'top10': top10,
        'bottom10': bottom10,
        'jami': len(reyting)
    })

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Smart University API ishlamoqda'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
