"use strict";

import snackbar from "snackbar";
import "snackbar/dist/snackbar.min.css";
import Chart from "chart.js/auto";

class FetchWrapper {
	constructor(baseURL) {
		this.baseURL = baseURL;
	}

	get(endpoint) {
		return fetch(this.baseURL + endpoint).then((response) => response.json());
	}

	put(endpoint, body) {
		return this._send("put", endpoint, body);
	}

	post(endpoint, body) {
		return this._send("post", endpoint, body);
	}

	patch(endpoint, body) {
		return this._send("patch", endpoint, body);
	}

	delete(endpoint, body) {
		return this._send("delete", endpoint, body);
	}

	_send(method, endpoint, body) {
		return fetch(this.baseURL + endpoint, {
			method,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		}).then((response) => response.json());
	}
}

// **************
// DOM selections
// **************

const form = document.querySelector("form");
const dropdown = document.querySelector("#dropdown");
const carbs = document.querySelector("#carbs");
const fats = document.querySelector("#fats");
const proteins = document.querySelector("#proteins");
const totalCalories = document.querySelector("#total-calories");
const foodLog = document.querySelector("#food-log");

const myEndpoint = "remusfoodtracker"; // you can change this endpoint if you want to start fresh
const API = new FetchWrapper(
	"https://firestore.googleapis.com/v1/projects/programmingjs-90a13/databases/(default)/documents/"
);

// *******************************************
// GET all food items from API when page loads
// *******************************************

(function () {
	let totalLoggedCalories = 0;
	let totalCarbs = 0;
	let totalFats = 0;
	let totalProteins = 0;

	document.addEventListener("DOMContentLoaded", init);

	function init() {
		API.get(myEndpoint)
			.then((data) => {
				// sort data coming from the API by timestamp
				// first item in the food log is the latest added food item (descending order by timestamp)
				const sortedData = data.documents.sort(
					(a, b) => new Date(b.createTime) - new Date(a.createTime)
				);
				sortedData.map((item) => {
					// create food item card to log section
					const timeCreated = new Date(item.updateTime);
					const foodValue = item.fields.food.stringValue;
					const carbsValue = item.fields.carbs.integerValue;
					const fatsValue = item.fields.fats.integerValue;
					const proteinsValue = item.fields.proteins.integerValue;

					// render each food item card to food log container
					foodLog.insertAdjacentHTML(
						"beforeend",
						`
					<div class="food-item">
						<h3>${foodValue.slice(0, 1).toUpperCase() + foodValue.slice(1)}</h3>
						<ul class="food-stats">
							<li>Carbs: <span>${carbsValue + "g"}</span></li>
							<li>Fats: <span>${fatsValue + "g"}</span></li>
							<li>Proteins: <span>${proteinsValue + "g"}</span></li>
							<li>Calories: <span>${calculateCalories(item)}</span></li>
						</ul>
						<p><i>${timeCreated.getDate()}.${
							timeCreated.getMonth() + 1
						}.${timeCreated.getFullYear()}</i></p>
						<p><i>${timeCreated.getHours()}:${
							timeCreated.getMinutes().toString().length < 2
								? 0 + timeCreated.getMinutes().toString()
								: timeCreated.getMinutes()
						}</i></p>
					</div>
				`
					);

					// Store all logged calories to a variable that is displayed in the log section
					totalLoggedCalories += calculateCalories(item);

					// turn food nutrient values from stringvalues to numbers and add them to total variables below, that are used as the data for the chart
					totalCarbs += +carbsValue;
					totalFats += +fatsValue;
					totalProteins += +proteinsValue;
				});
				totalCalories.textContent = totalLoggedCalories;

				// Chart rendered with every page refresh
				renderChart(totalCarbs, totalFats, totalProteins);
			})
			.catch((error) => console.log(error.message));
	}
})();

// **********************
// POST food items to API with notification
// **********************

form.addEventListener("submit", (e) => {
	// so the page doesn't refresh every time the form is submitted
	e.preventDefault();

	// post method requires your endpoint and the body (in this case the fields object)
	// the firebase API wants the values formatted like below (with e.g. 'stringValue')

	API.post(myEndpoint, {
		fields: {
			food: { stringValue: dropdown.value }, // select element
			carbs: { integerValue: carbs.value },
			fats: { integerValue: fats.value },
			proteins: { integerValue: proteins.value },
		},
	});

	// Notification when food item is added
	snackbar.show("New food item added successfully!");
});

// ******************
// Calculate calories
// ******************

function calculateCalories(data) {
	// Formula:
	// carbs and protein are 4 cals per 1g, fats are 9 cals per 1g

	let cals = 0;
	const carbs = data.fields.carbs.integerValue * 4;
	const fats = data.fields.fats.integerValue * 9;
	const proteins = data.fields.proteins.integerValue * 4;

	cals += carbs + fats + proteins;
	return cals;
}

// *****
// Chart
// *****

function renderChart(carbs, fats, proteins) {
	var ctx = document.getElementById("myChart").getContext("2d");
	var myChart = new Chart(ctx, {
		type: "doughnut",
		data: {
			labels: ["Carbs (g)", "Fats (g)", "Proteins (g)"],
			datasets: [
				{
					data: [carbs, fats, proteins],
					backgroundColor: [
						"rgba(62, 219, 0, 1)",
						"rgba(255, 222, 36, 1)",
						"rgba(255, 87, 36, 1)",
					],
					hoverBackgroundColor: [
						"rgba(62, 219, 0, 0.7)",
						"rgba(255, 222, 36, 0.7)",
						"rgba(255, 87, 36, 0.7)",
					],
					borderColor: "#222",
					borderWidth: 2,
					spacing: 5,
				},
			],
		},
		options: {
			plugins: {
				legend: {
					position: "right",
				},
				title: {
					display: true,
					text: "Nutritional distribution of all items in food log",
				},
			},
		},
	});
}
