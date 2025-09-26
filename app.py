"""
Mumbai Local Crowd & Safety API

This Flask application serves a web interface and an API to provide
crowd and safety analysis for Mumbai's local train stations.
"""

from flask import Flask, jsonify, request, render_template
import pandas as pd


# --- App Initialization ---
app = Flask(__name__)


# --- Data Loading and Processing ---

def load_data(path="mumbai_local.csv"):
    """
    Load and prepare the dataset from the specified CSV file.

    Args:
        path (str): The path to the CSV file.

    Returns:
        pd.DataFrame: A prepared DataFrame.
    """
    try:
        df = pd.read_csv(path)
        df = df.rename(columns={"Station": "station", "Time": "time"})
        df['hour'] = df['time'].apply(lambda x: int(x.split(':')[0]))
        return df
    except FileNotFoundError:
        return pd.DataFrame()


main_df = load_data()


# --- Main Web Page Route ---

@app.route("/")
def home():
    """Render the main HTML page."""
    return render_template('index.html')


# --- API Routes ---

@app.route("/api/stations")
def get_stations():
    """Return a JSON list of all unique station names."""
    if main_df.empty:
        return jsonify({"error": "Dataset not loaded"}), 500

    stations = sorted(main_df['station'].unique().tolist())
    return jsonify(stations)


@app.route("/api/station_analysis")
def get_station_analysis():
    """
    Return a JSON object with data for a specific station.
    
    Expects a URL query parameter like: ?name=Dadar
    """
    station_name = request.args.get("name")

    if not station_name:
        return jsonify({"error": "A 'name' parameter is required."}), 400

    station_data = main_df[
        main_df['station'].str.lower() == station_name.lower()
    ]

    if station_data.empty:
        return jsonify({"error": f"Station '{station_name}' not found."}), 404

    return jsonify(station_data.to_dict(orient='records'))


# --- Start the Server ---

if __name__ == "__main__":
    # The port is set to 5001 to avoid conflicts
    app.run(debug=True, port=5001)