document.addEventListener('DOMContentLoaded', () => {
    // API URL
    const API_BASE_URL = '/api';

    // Get HTML elements
    const stationInput = document.getElementById('stationInput');
    const analysisBtn = document.getElementById('analysisBtn');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error-message');
    let analysisChart = null;
    let stations = []; // Store the full list of stations

    // Function to fetch the station list and initialize the autocomplete
    const loadStations = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stations`);
            if (!response.ok) throw new Error('Network error');
            stations = await response.json();
            initializeAutocomplete(stations);
        } catch (error) {
            errorDiv.textContent = 'Error: Could not fetch station list. Is the API running?';
        }
    };

    // --- UPDATED AUTOCOMPLETE LOGIC ---

    function initializeAutocomplete(stationList) {
        // This function shows the suggestion list
        function showSuggestions(inputValue) {
            const val = inputValue.toUpperCase();
            closeAllLists();

            // Create the container for the suggestion list
            const suggestionsDiv = document.createElement("DIV");
            suggestionsDiv.setAttribute("id", stationInput.id + "autocomplete-list");
            suggestionsDiv.setAttribute("class", "autocomplete-items");
            stationInput.parentNode.appendChild(suggestionsDiv);

            // Loop through all stations and create list items
            stationList.forEach(station => {
                // If input is empty (on click), show all. Otherwise, filter.
                if (!val || station.toUpperCase().startsWith(val)) {
                    const suggestionItem = document.createElement("DIV");
                    // Bold the matching part
                    suggestionItem.innerHTML = `<strong>${station.substr(0, val.length)}</strong>${station.substr(val.length)}`;
                    suggestionItem.innerHTML += `<input type='hidden' value='${station}'>`;

                    // Add click event to each item in the list
                    suggestionItem.addEventListener("click", function(e) {
                        stationInput.value = this.getElementsByTagName("input")[0].value;
                        closeAllLists();
                        getAnalysis();
                    });
                    suggestionsDiv.appendChild(suggestionItem);
                }
            });
        }

        // Add an event listener for typing
        stationInput.addEventListener("input", function() {
            showSuggestions(this.value);
        });
        
        // Add an event listener for clicking on the input box
        stationInput.addEventListener("click", function() {
            // Check if a list is already open to prevent re-opening
            if (!document.querySelector(".autocomplete-items")) {
                 showSuggestions(""); // Pass empty string to show all stations
            }
        });

        // Function to close all autocomplete lists
        function closeAllLists(elmnt) {
            const x = document.getElementsByClassName("autocomplete-items");
            for (let i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != stationInput) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }
        
        // Close the list when someone clicks elsewhere on the page
        document.addEventListener("click", function(e) {
            closeAllLists(e.target);
        });
    }

    // --- ANALYSIS LOGIC (Remains the same) ---
    const getAnalysis = async () => {
        const stationName = stationInput.value;
        if (!stationName) return;

        resultsDiv.innerHTML = '<p>Loading analysis...</p>';
        errorDiv.textContent = '';
        try {
            const response = await fetch(`${API_BASE_URL}/station_analysis?name=${stationName}`);
            if (!response.ok) throw new Error('Station not found or API error.');
            const data = await response.json();
            displayResults(stationName, data);
        } catch (error) {
            resultsDiv.innerHTML = '';
            errorDiv.textContent = `Error: Could not get analysis for "${stationName}".`;
        }
    };

    const displayResults = (stationName, data) => {
        let tableHTML = `
            <h2>24-Hour Analysis for ${stationName}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Crowd Level</th>
                        <th>Safety Rating (1-5)</th>
                    </tr>
                </thead>
                <tbody>`;
        data.forEach(row => {
            tableHTML += `
                <tr>
                    <td>${row.time}</td>
                    <td>${row.Crowd_Level}</td>
                    <td>${row.Safety_Rating}</td>
                </tr>`;
        });
        tableHTML += '</tbody></table>';

        const chartHTML = `<div class="chart-container"><canvas id="analysisChart"></canvas></div>`;
        resultsDiv.innerHTML = chartHTML + tableHTML;

        if (analysisChart) {
            analysisChart.destroy();
        }

        const ctx = document.getElementById('analysisChart').getContext('2d');
        const crowdMap = {'Low': 1, 'Medium': 2, 'High': 3};
        
        analysisChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(row => row.time),
                datasets: [{
                    label: 'Safety Rating',
                    data: data.map(row => row.Safety_Rating),
                    borderColor: 'green',
                    yAxisID: 'ySafety',
                    tension: 0.1
                }, {
                    label: 'Crowd Level',
                    data: data.map(row => crowdMap[row.Crowd_Level]),
                    borderColor: 'red',
                    stepped: true,
                    yAxisID: 'yCrowd'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    ySafety: {
                        type: 'linear', position: 'left',
                        min: 0, max: 5,
                        title: { display: true, text: 'Safety Rating' }
                    },
                    yCrowd: {
                        type: 'linear', position: 'right',
                        min: 0, max: 4,
                        ticks: {
                            stepSize: 1,
                            callback: (value) => ['','Low','Medium','High',''][value]
                        },
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Crowd Level' }
                    }
                }
            }
        });
    };
    
    // --- Event Listeners ---
    loadStations();
    analysisBtn.addEventListener('click', getAnalysis);
});