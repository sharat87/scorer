const { h, app } = window.hyperapp;

const HISTORY_MAX_ENTRIES = 10;
class History {

	constructor(entries) {
		this.entries = entries || [];
	}

	add(entry) {
		this.entries.unshift({ time: new Date(), entry });
		this.entries.splice(HISTORY_MAX_ENTRIES);
	}

	get size() {
		return this.entries.length;
	}

	map(fn) {
		return this.entries.map(fn);
	}
}

app({

	init: [
		{},
		[
			loadState,
			{
				devMode: false,
				scores: new Map(),
				highestWins: true,
				history: new History(),
				newPlayerName: "",
				newPlayerColor: "",
				colorList: [
					"orange",
					"violet",
					"yellow",
					"white",
					"lightblue",
				],
			},
		],
	],

	view,

	/*
	subscriptions: state => [
		[
			saveStateSub,
			state,
		],
	],
	*/

	node: document.getElementById("app"),

});

/*
function saveStateSub(dispatch, state) {
	save(state);
	return () => null;
}
 */

function save(state) {
	localStorage.setItem("scores", JSON.stringify(Array.from(state.scores.entries())));
	localStorage.setItem("history", JSON.stringify(state.history.entries));
	return state;
}

function loadState(dispatch, state) {
	const rawScores = localStorage.getItem("scores");
	if (rawScores) {
		state.scores = new Map(JSON.parse(rawScores));
		rankScores(state.scores, state.highestWins);
	}

	const rawHistory = localStorage.getItem("history");
	if (rawHistory) {
		state.history = new History(JSON.parse(rawHistory).map(hist => {
			hist.time = new Date(hist.time);
			return hist;
		}));
	}

	if (localStorage.getItem("dev") === "1") {
		state.devMode = true;
	}

	dispatch(state);
}

function view(state) {
	const playerItems = [];
	for (const [name, player] of state.scores) {
		const { score, color } = player;
		playerItems.push(h("tr", {}, [
			h("td", { class: state.newPlayerName === name ? "red" : "" }, [
				h(
					"label",
					{
						class: "bubble" + (color ? "" : " no-color"),
						style: { backgroundColor: color },
						title: color,
					},
					h("input", { type: "color", style: { visibility: "hidden" }, onchange: colorSetter(name) })
				),
				h("span", {}, name),
			]),
			h("td", {}, h("div", { class: "score-box" }, [
				player.score && player.rank ?
					h("span", { class: "rank r" + player.rank }, player.rank) :
					h("span"),
				h("span", {}, " " + score),
			])),
			h("td", {}, [
				makeIncrementer(name, -1),
				h("span", { class: "button-bar", style: { marginLeft: "1em" } }, [
					makeIncrementer(name, "+1"),
					makeIncrementer(name, 2),
					makeIncrementer(name, 3),
					makeIncrementer(name, 4),
					makeIncrementer(name, 5),
					makeIncrementer(name, 6),
					makeIncrementer(name, 7),
				]),
			]),
			h("td", { class: "actions" }, [
				// h("button", {}, "Up"),
				// h("button", {}, "Down"),
				// h("button", {}, "Edit"),
				h("button", { class: "red", onclick: (state) => {
					state.history.add({
						event: "delPlayer",
						player: state.scores.get(name),
					});
					state.scores.delete(name);
					return { ...state };
				}, }, "Del"),
			]),
		]));
	}

	return h("div", {}, [
		playerItems.length <= 0 ? h("p", {}, "No players. Please add a player below.") : h("div", { class: "table-box" }, h("table", {}, [
			h("thead", {}, h("tr", {}, [
				h("th", {}, "Name"),
				h("th", {}, "Score"),
				h("th", {}, "Change"),
				h("th", {}, "Actions"),
			])),
			h("tbody", {}, playerItems),
		])),

		h("form", { onsubmit: onAddFormSubmit }, [
			h("input", {
				placeholder: "New player name",
				required: true,
				autofocus: true,
				class: state.scores.has(state.newPlayerName) ? "red" : "",
				oninput(state, event) { return { ...state, newPlayerName: event.target.value }; },
			}),
			state.colorList.length > 0 || h("input", {
				type: "color",
				onchange(state, event) { return { ...state, newPlayerColor: event.target.value }; },
			}),
			state.colorList.length > 0 && h("input", {
				placeholder: "Player color",
				list: "colorList",
				onchange(state, event) { return { ...state, newPlayerColor: event.target.value }; },
			}),
			state.colorList.length > 0 && h("datalist", { id: "colorList" }, state.colorList.map(c => h("option", { value: c }))),
			h("button", { type: "submit" }, "Add Player"),
		]),

		h("p", {}, [
			h("label", {}, [
				h("input", { type: "radio", name: "_1", value: 1, checked: state.highestWins, onchange: state => {
						state.highestWins = true;
						rankScores(state.scores, state.highestWins);
						return save({ ...state });
					}}),
				"Highest score wins"
			]),
			h("label", { style: {marginLeft: "1em" } }, [
				h("input", { type: "radio", name: "_1", value: 2, checked: !state.highestWins, onchange: state => {
						state.highestWins = false;
						rankScores(state.scores, state.highestWins);
						return save({ ...state });
					}}),
				"Lowest score wins"
			]),
		]),

		state.scores.size > 0 && h("p", {}, [
			h("button", { type: "button", class: "red", onclick: onResetScoresClicked }, "Reset Scores"),
			h("button", { type: "button", class: "red", style: { marginLeft: "6px" }, onclick: onDeleteAllClicked }, "Delete all Players"),
		]),

		state.devMode && h("pre", {}, JSON.stringify(Array.from(state.scores.entries()), null, 2)),

		state.devMode && h("div", {}, [
			h("h2", {}, "History"),
			state.history.size === 0 ?
				h("p", {}, "Nothing yet.") :
				state.history.map(hist => h("p", {}, [
					h("span", {}, hist.time.toISOString() + ": "),
					h("code", {}, JSON.stringify(hist.entry)),
				])),
		]),
	]);

	function makeIncrementer(name, value) {
		const intValue = parseInt(value, 10);
		return h("button", { onclick }, value);

		function onclick(state) {
			state.scores.get(name).score += intValue;
			rankScores(state.scores, state.highestWins);
			state.history.add({
				event: "addScore",
				name,
				value: intValue,
			});
			return save({ ...state });
		}
	}

	function onAddFormSubmit(state, event) {
		event.preventDefault();

		if (state.scores.has(state.newPlayerName)) {
			alert("Player with that name already added. Please give a different name.");
			return state;
		}

		state.scores.set(state.newPlayerName, {
			score: 0,
			color: state.newPlayerColor,
		});
		state.history.add({
			event: "addPlayer",
			name: state.newPlayerName,
			color: state.newPlayerColor,
		});
		state.newPlayerName = state.newPlayerColor = "";
		for (const el of event.target.querySelectorAll("input")) {
			el.value = "";
		}
		event.target.querySelector("input").focus();
		return save({ ...state });
	}

	function onResetScoresClicked(state) {
		state.history.add({
			event: "resetScores",
			scores: state.scores.entries(),
		});
		for (const player of state.scores.values()) {
			player.score = 0;
		}
		return save({ ...state });
	}

	function onDeleteAllClicked(state) {
		state.history.add({
			event: "deleteAll",
			scores: state.scores.entries(),
		});
		state.scores.clear();
		return save({ ...state });
	}
}

function colorSetter(name) {
	return (state, event) => {
		state.scores.get(name).color = event.target.value;
		return save({ ...state });
	};
}

function rankScores(scores, highestWins) {
	const pairs = [];
	for (const [name, player] of scores) {
		player.rank = 0;
		pairs.push({ name, score: player.score });
	}
	pairs.sort(highestWins ? (a, b) => b.score - a.score : (a, b) => a.score - b.score);
	for (const [i, { name, score }] of pairs.entries()) {
		scores.get(name).rank = i + 1;
	}
}
