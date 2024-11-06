// Fetch standings data
fetch('standings.json')
    .then(response => response.json())
    .then(data => {
        const teams = calculateTeamPoints(data.drivers);
        displayDriverStandings(data.drivers);
        displayTeamStandings(teams);
    })
    .catch(error => console.error('Error fetching standings:', error));

// Fetch calendar and rules data
fetch('calendar_and_rules.json')
    .then(response => response.json())
    .then(data => {
        displaySchedule(data.calendar);
        displayRules(data.rules);
    })
    .catch(error => console.error('Error fetching calendar and rules:', error));

// Function to display driver standings
function displayDriverStandings(drivers) {
    const table = document.getElementById('driver-standings-table');

    // Clear existing content
    table.innerHTML = '';

    // Calculate total points and sort drivers
    drivers.forEach(driver => {
        driver.totalPoints = driver.points_per_race.reduce((a, b) => a + b, 0);
    });

    drivers.sort((a, b) => b.totalPoints - a.totalPoints);

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = ['Pos.', 'Rijder', 'Team'];
    const numRaces = drivers[0].points_per_race.length;
    for (let i = 1; i <= numRaces; i++) {
        headers.push(`Race ${i}`);
    }
    headers.push('Puntentotaal');

    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;

        if (headerText.startsWith('Race') || headerText.startsWith('Pos.') || headerText.startsWith('Puntentotaal')) {
            th.classList.add('center');
        }
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    drivers.forEach((driver, index) => {
        const row = document.createElement('tr');

        if (driver.team != null) {
            if (driver.team.includes("Oranje")) {
                row.classList.add('orange');
            }

            if (driver.team.includes("Rood")) {
                row.classList.add('red');
            }    
    
            if (driver.team.includes("Groen")) {
                row.classList.add('green');
            }

            if (driver.team.includes("Blauw")) {
                row.classList.add('blue');
            }
        }

        // Position
        const positionCell = document.createElement('td');
        positionCell.textContent = index + 1;
        positionCell.setAttribute('data-label', 'Position');
        positionCell.classList.add('center');
        row.appendChild(positionCell);

        // Driver Name
        const nameCell = document.createElement('td');
        nameCell.textContent = driver.name;
        nameCell.setAttribute('data-label', 'Driver');
        row.appendChild(nameCell);

        // Team Name
        const teamCell = document.createElement('td');

        const carName = document.createElement('span')
        carName.classList.add("carname")
        carName.textContent = driver.car

        teamCell.innerText = driver.team
        teamCell.appendChild(document.createElement('br'))
        teamCell.appendChild(carName)
        
        teamCell.setAttribute('data-label', 'Team');
        row.appendChild(teamCell);

        // Points per race
        driver.points_per_race.forEach((points, idx) => {
            const pointsCell = document.createElement('td');
            pointsCell.textContent = points;
            pointsCell.setAttribute('data-label', `Race ${idx + 1}`);
            pointsCell.classList.add('center');
            row.appendChild(pointsCell);
        });

        // Total Points
        const totalCell = document.createElement('td');
        totalCell.textContent = driver.totalPoints;
        totalCell.setAttribute('data-label', 'Total Points');
        totalCell.classList.add('center');
        row.appendChild(totalCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
}

// Function to calculate team points (unchanged)
function calculateTeamPoints(drivers) {
    const teamMap = {};

    drivers.forEach(driver => {
        const teamName = driver.team;
        if (!teamMap[teamName]) {
            teamMap[teamName] = {
                name: teamName,
                points_per_race: Array(driver.points_per_race.length).fill(0)
            };
        }
        driver.points_per_race.forEach((points, index) => {
            teamMap[teamName].points_per_race[index] += points;
        });
    });

    // Convert the teamMap to an array
    const teams = Object.values(teamMap);

    // Calculate total points for each team
    teams.forEach(team => {
        team.totalPoints = team.points_per_race.reduce((a, b) => a + b, 0);
    });

    // Sort teams by total points in descending order
    teams.sort((a, b) => b.totalPoints - a.totalPoints);

    return teams;
}

// Function to display team standings
function displayTeamStandings(teams) {
    const table = document.getElementById('team-standings-table');

    // Clear existing content
    table.innerHTML = '';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = ['Pos.', 'Team'];
    const numRaces = teams[0].points_per_race.length;
    for (let i = 1; i <= numRaces; i++) {
        headers.push(`Race ${i}`);
    }
    headers.push('Puntentotaal');

    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;

        if (headerText.startsWith('Race') || headerText.startsWith('Pos.') || headerText.startsWith('Puntentotaal')) {
            th.classList.add('center');
        }

        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    teams.filter((team) => team.name != null).forEach((team, index) => {
        const row = document.createElement('tr');

        if (team.name.includes("Oranje")) {
            row.classList.add('orange');
        }

        if (team.name.includes("Rood")) {
            row.classList.add('red');
        }

        if (team.name.includes("Groen")) {
            row.classList.add('green');
        }

        if (team.name.includes("Blauw")) {
            row.classList.add('blue');
        }

        // Position
        const positionCell = document.createElement('td');
        positionCell.textContent = index + 1;
        positionCell.setAttribute('data-label', 'Position');
        positionCell.classList.add('center');
        row.appendChild(positionCell);

        // Team Name
        const nameCell = document.createElement('td');
        nameCell.textContent = team.name;
        nameCell.setAttribute('data-label', 'Team');
        row.appendChild(nameCell);

        // Points per race
        team.points_per_race.forEach((points, idx) => {
            const pointsCell = document.createElement('td');
            pointsCell.textContent = points;
            pointsCell.setAttribute('data-label', `Race ${idx + 1}`);
            pointsCell.classList.add('center');
            row.appendChild(pointsCell);
        });

        // Total Points
        const totalCell = document.createElement('td');
        totalCell.textContent = team.totalPoints;
        totalCell.setAttribute('data-label', 'Total Points');
        totalCell.classList.add('center');
        row.appendChild(totalCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
}

// Function to display schedule
function displaySchedule(calendar) {
    const container = document.getElementById('schedule-container');
    if (!container) {
        console.error('schedule-container element not found in the DOM.');
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    calendar.forEach((event, index) => {
        // Create a button for the collapsible header
        const collapsibleButton = document.createElement('button');
        collapsibleButton.classList.add('collapsible');
        collapsibleButton.textContent = `${event.date} - ${event.race} : ${event.location}`;
        collapsibleButton.addEventListener('click', function () {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });

        // Create a div for the collapsible content
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('collapsible-content');

        // Create a table to display the details
        const detailsTable = document.createElement('table');

        for (const [key, value] of Object.entries(event.details)) {
            const row = document.createElement('tr');

            if (value === null || value === undefined || value === '') {
                // Create a section header row
                const headerCell = document.createElement('td');
                headerCell.textContent = key;
                headerCell.colSpan = 2;
                headerCell.classList.add('detail-section-header');

                row.appendChild(headerCell);
            } else {
                // Create normal key-value row
                const keyCell = document.createElement('td');
                keyCell.textContent = key;
                keyCell.classList.add('detail-key');

                const valueCell = document.createElement('td');
                valueCell.textContent = value;
                valueCell.classList.add('detail-value');

                row.appendChild(keyCell);
                row.appendChild(valueCell);
            }

            detailsTable.appendChild(row);
        }

        contentDiv.appendChild(detailsTable);

        // Append elements to the container
        container.appendChild(collapsibleButton);
        container.appendChild(contentDiv);
    });
}


// Function to display rules
function displayRules(rules) {
    const container = document.getElementById('rules-container');
    if (!container) {
        console.error('rules-container element not found in the DOM.');
        return;
    }

    const list = document.createElement('ul');

    rules.forEach(rule => {
        const listItem = document.createElement('li');
        listItem.textContent = rule;
        list.appendChild(listItem);
    });

    container.appendChild(list);
}