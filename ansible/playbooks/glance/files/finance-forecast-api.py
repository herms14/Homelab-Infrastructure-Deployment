#!/usr/bin/env python3
"""
Finance Forecast API for Glance Dashboard
Provides savings forecasts, investment projections, and insurance tracking
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
import math

app = Flask(__name__)
CORS(app)

# Configuration paths
CONFIG_DIR = os.environ.get('CONFIG_DIR', '/app/config')
INSURANCE_FILE = os.path.join(CONFIG_DIR, 'insurance.json')
SAVINGS_FILE = os.path.join(CONFIG_DIR, 'savings.json')

def load_json_file(filepath, default=None):
    """Load JSON file with fallback to default"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else {}

def save_json_file(filepath, data):
    """Save data to JSON file"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def calculate_compound_growth(principal, monthly_contribution, annual_rate, years):
    """Calculate compound growth with monthly contributions"""
    monthly_rate = annual_rate / 12
    months = years * 12

    # Future value with compound interest and regular contributions
    if monthly_rate > 0:
        # FV = P(1+r)^n + PMT * (((1+r)^n - 1) / r)
        fv_principal = principal * ((1 + monthly_rate) ** months)
        fv_contributions = monthly_contribution * (((1 + monthly_rate) ** months - 1) / monthly_rate)
        return fv_principal + fv_contributions
    else:
        return principal + (monthly_contribution * months)

def generate_forecast_series(principal, monthly_contribution, annual_rate, years):
    """Generate yearly forecast data points"""
    data_points = []
    for year in range(years + 1):
        value = calculate_compound_growth(principal, monthly_contribution, annual_rate, year)
        data_points.append({
            'year': year,
            'date': (datetime.now() + timedelta(days=year*365)).strftime('%Y'),
            'value': round(value, 2),
            'contributions': round(principal + (monthly_contribution * 12 * year), 2),
            'growth': round(value - principal - (monthly_contribution * 12 * year), 2)
        })
    return data_points

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'finance-forecast-api'})

@app.route('/api/savings-forecast', methods=['GET'])
def savings_forecast():
    """
    Calculate savings forecast
    Query params:
    - balance: current balance (default from config)
    - monthly: monthly contribution (default from config)
    - rate: annual interest rate as decimal (default 0.05 = 5%)
    - years: forecast years (default 10)
    """
    # Load saved configuration
    savings_config = load_json_file(SAVINGS_FILE, {
        'current_balance': 10000,
        'monthly_contribution': 500,
        'interest_rate': 0.05,
        'name': 'Savings Account'
    })

    # Get parameters (query params override config)
    balance = float(request.args.get('balance', savings_config.get('current_balance', 10000)))
    monthly = float(request.args.get('monthly', savings_config.get('monthly_contribution', 500)))
    rate = float(request.args.get('rate', savings_config.get('interest_rate', 0.05)))
    years = int(request.args.get('years', 10))

    # Calculate projections
    forecast_data = generate_forecast_series(balance, monthly, rate, years)

    projected_5yr = calculate_compound_growth(balance, monthly, rate, 5)
    projected_10yr = calculate_compound_growth(balance, monthly, rate, 10)

    return jsonify({
        'name': savings_config.get('name', 'Savings'),
        'current_balance': balance,
        'monthly_contribution': monthly,
        'interest_rate': rate,
        'interest_rate_percent': f"{rate * 100:.1f}%",
        'projected_5yr': round(projected_5yr, 2),
        'projected_10yr': round(projected_10yr, 2),
        'total_contributions_5yr': round(balance + (monthly * 12 * 5), 2),
        'total_contributions_10yr': round(balance + (monthly * 12 * 10), 2),
        'growth_5yr': round(projected_5yr - balance - (monthly * 12 * 5), 2),
        'growth_10yr': round(projected_10yr - balance - (monthly * 12 * 10), 2),
        'forecast': forecast_data
    })

@app.route('/api/investment-forecast', methods=['GET'])
def investment_forecast():
    """
    Calculate investment portfolio forecast
    Query params:
    - portfolio: current portfolio value
    - return_rate: expected annual return (default 0.07 = 7%)
    - monthly: monthly investment (default 0)
    - years: forecast years (default 10)
    """
    portfolio = float(request.args.get('portfolio', 50000))
    return_rate = float(request.args.get('return_rate', 0.07))
    monthly = float(request.args.get('monthly', 0))
    years = int(request.args.get('years', 10))

    # Calculate projections
    forecast_data = generate_forecast_series(portfolio, monthly, return_rate, years)

    # Calculate with different scenarios
    conservative = calculate_compound_growth(portfolio, monthly, return_rate * 0.5, years)  # 50% of expected
    expected = calculate_compound_growth(portfolio, monthly, return_rate, years)
    optimistic = calculate_compound_growth(portfolio, monthly, return_rate * 1.5, years)  # 150% of expected

    return jsonify({
        'current_portfolio': portfolio,
        'monthly_investment': monthly,
        'expected_return': return_rate,
        'expected_return_percent': f"{return_rate * 100:.1f}%",
        'projections': {
            'conservative': round(conservative, 2),
            'expected': round(expected, 2),
            'optimistic': round(optimistic, 2)
        },
        'projected_5yr': round(calculate_compound_growth(portfolio, monthly, return_rate, 5), 2),
        'projected_10yr': round(expected, 2),
        'forecast': forecast_data
    })

@app.route('/api/insurance', methods=['GET'])
def get_insurance():
    """Get insurance policies from config file"""
    insurance_data = load_json_file(INSURANCE_FILE, {
        'policies': [
            {
                'name': 'Example Health Insurance',
                'provider': 'Provider Name',
                'policy_number': 'XXXX-XXXX',
                'coverage': '$500,000',
                'premium': '$200/month',
                'renewal_date': '2026-12-31',
                'type': 'health',
                'status': 'active'
            }
        ],
        'note': 'Edit /app/config/insurance.json to add your policies'
    })

    # Calculate days until renewal for each policy
    for policy in insurance_data.get('policies', []):
        if 'renewal_date' in policy:
            try:
                renewal = datetime.strptime(policy['renewal_date'], '%Y-%m-%d')
                days_until = (renewal - datetime.now()).days
                policy['days_until_renewal'] = days_until
                policy['renewal_status'] = 'urgent' if days_until < 30 else ('soon' if days_until < 90 else 'ok')
            except ValueError:
                policy['days_until_renewal'] = None
                policy['renewal_status'] = 'unknown'

    return jsonify(insurance_data)

@app.route('/api/insurance', methods=['POST'])
def update_insurance():
    """Update insurance policies"""
    data = request.get_json()
    save_json_file(INSURANCE_FILE, data)
    return jsonify({'status': 'success', 'message': 'Insurance policies updated'})

@app.route('/api/savings-config', methods=['GET'])
def get_savings_config():
    """Get savings configuration"""
    return jsonify(load_json_file(SAVINGS_FILE, {
        'current_balance': 10000,
        'monthly_contribution': 500,
        'interest_rate': 0.05,
        'name': 'Savings Account'
    }))

@app.route('/api/savings-config', methods=['POST'])
def update_savings_config():
    """Update savings configuration"""
    data = request.get_json()
    save_json_file(SAVINGS_FILE, data)
    return jsonify({'status': 'success', 'message': 'Savings configuration updated'})

@app.route('/api/net-worth-summary', methods=['GET'])
def net_worth_summary():
    """
    Get a summary of net worth including savings and investments
    """
    savings_config = load_json_file(SAVINGS_FILE, {
        'current_balance': 10000,
        'monthly_contribution': 500,
        'interest_rate': 0.05
    })

    # Get investment value from query param (would come from Ghostfolio in real use)
    investments = float(request.args.get('investments', 50000))
    crypto = float(request.args.get('crypto', 5000))

    total = savings_config.get('current_balance', 0) + investments + crypto

    # Calculate projected net worth
    savings_5yr = calculate_compound_growth(
        savings_config.get('current_balance', 0),
        savings_config.get('monthly_contribution', 0),
        savings_config.get('interest_rate', 0.05),
        5
    )
    investments_5yr = calculate_compound_growth(investments, 0, 0.07, 5)

    return jsonify({
        'current': {
            'savings': savings_config.get('current_balance', 0),
            'investments': investments,
            'crypto': crypto,
            'total': total
        },
        'projected_5yr': {
            'savings': round(savings_5yr, 2),
            'investments': round(investments_5yr, 2),
            'total': round(savings_5yr + investments_5yr + crypto, 2)
        },
        'breakdown': [
            {'name': 'Savings', 'value': savings_config.get('current_balance', 0), 'percent': round(savings_config.get('current_balance', 0) / total * 100, 1) if total > 0 else 0},
            {'name': 'Investments', 'value': investments, 'percent': round(investments / total * 100, 1) if total > 0 else 0},
            {'name': 'Crypto', 'value': crypto, 'percent': round(crypto / total * 100, 1) if total > 0 else 0}
        ]
    })

if __name__ == '__main__':
    # Ensure config directory exists
    os.makedirs(CONFIG_DIR, exist_ok=True)

    # Create default config files if they don't exist
    if not os.path.exists(INSURANCE_FILE):
        save_json_file(INSURANCE_FILE, {
            'policies': [
                {
                    'name': 'Health Insurance',
                    'provider': 'Update in config',
                    'policy_number': 'XXXX-XXXX',
                    'coverage': '$500,000',
                    'premium': '$200/month',
                    'renewal_date': '2026-12-31',
                    'type': 'health',
                    'status': 'active'
                }
            ]
        })

    if not os.path.exists(SAVINGS_FILE):
        save_json_file(SAVINGS_FILE, {
            'current_balance': 10000,
            'monthly_contribution': 500,
            'interest_rate': 0.05,
            'name': 'Savings Account'
        })

    app.run(host='0.0.0.0', port=5060, debug=False)
