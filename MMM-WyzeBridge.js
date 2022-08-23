/* global Module */

/* Magic Mirror
 * Module: MMM-WyzeBridge
 *
 * By Andrés Vanegas <ukab72106@gmail.com>
 * MIT Licensed.
 */
Module.register("MMM-WyzeBridge", {
	/**
	 * @member {Object} defaults - Defines the default config values.
	 * @property {int} updateInterval Default time to show next camera (in milliseconds). Defaults to 30000.
	 * @property {int} retryDelay Time to ask to wyze-bridge server for cameras updates (in milliseconds). Defaults to 5000.
	 * @property {boolean} controls If video player should show its controls. Defaults to false.
	 * @property {int} height video player height. Defaults to 350.
	 * @property {int} width video player width. Defaults to 700.
	 * @property {string} targetHost wyze-bridge host to connect (e.g http://localhost). Defaults to null.
	 * @property {int} targetPort wyze-bridge port to connect (e.g 5000). Defaults to null.
	 * @property {int} animationSpeed Animation speed to update DOM. Defaults to 400.
	 * @property {str[]|RegExp[]} filter camera filters (can be a string representing name, pattern or a regex). Defaults to [] (empty array).
	*/
	defaults: {
		updateInterval: 30000,
		retryDelay: 5000,
		controls: false,
		height: 350,
		width: 700,
		targetHost: null,
		targetPort: null,
		animationSpeed: 400,
		filter: [],
	},

	// Required version of MagicMirror
	requiresVersion: "2.1.0",

	// Placeholders
	wrapper: null,
	message: null,
	messageWrapper: null,
	playerWrapper: null,
	player: null,
	cameras: 0,

	// Overrides start method
	start: function () {
		this.config = {
			...this.defaults,
			...this.config,
		};
		this.message = this.translate("LOADING");

		this.updateDom(this.config.animationSpeed);
		this.sendNotification("SET_CONFIG", {
			...this.config,
			__protocol: window.location.protocol,
			__port: window.location.port,
		});
	},

	/**
	 * Notification send helper method
	 * @param {string} notification notification type
	 * @param {any} payload notification payload
	 */
	sendNotification(notification, payload) {
		this.sendSocketNotification(this.name + "-" + notification, payload);
	},

	// Override socket notification received method
	socketNotificationReceived: function (notification, payload) {
		switch (notification.replace(this.name + "-", "")) {
			case "CAMERAS_UPDATED":
				this.cameras = payload;
				break;
			case "SET_MESSAGE":
				this.message = this.translate(payload)
				this.updateDom(this.config.animationSpeed);
				break;
			case "SET_CAMERA":
				this.message = null;
				this.updateDom(this.config.animationSpeed);
				this.swapSource(payload);
				break;
		}
	},

	/**
	 * Change current camera and activate player
	 * @param {object} camera camera data to be show
	 */
	swapSource: function (camera) {
		Log.log("Showing camera " + camera.nickname);
		if (this.player === null) {
			this.showPlayer();
		}
		// this.player.poster("/" + this.name + camera.image_url);
		this.player.src({
			src: "/" + this.name + camera.video_url,
			type: 'application/x-mpegURL',
		});
		this.player.play();
	},

	/**
	 * Clears an attribute from this instance
	 * @param {string} nodename attribute to be clear
	 */
	clearNode(nodename) {
		try {
			switch (nodename) {
				case 'player':
					if (this.player !== null) {
						this.player.dispose();
					}
					break;
				default:
					if (this[nodename] !== null) {
						this[nodename].parentNode.removeChild(this[nodename])
					}
			}
		} catch (e) { }

		if (this.hasOwnProperty(nodename)) {
			this[nodename] = null;
		}
	},

	/**
	 * Show message in wrapper and hide the player
	 */
	showMessage() {
		this.clearNode('player');
		this.clearNode('playerWrapper');

		if (this.messageWrapper === null) {
			this.messageWrapper = document.createElement("div");
			this.messageWrapper.classList.add("message-container");
			this.messageWrapper.style.width = this.config.width + "px";
			this.messageWrapper.style.height = this.config.height + "px";
			this.wrapper.appendChild(this.messageWrapper);
		}
		this.messageWrapper.innerHTML = this.message;
	},

	/**
	 * Show player and hide the message
	 */
	showPlayer() {
		this.clearNode('messageWrapper');

		if (this.playerWrapper === null) {
			this.playerWrapper = document.createElement("video-js");
			this.playerWrapper.classList.add("player_" + this.name);
			this.playerWrapper.setAttribute("id", "player_" + this.identifier);
			this.wrapper.appendChild(this.playerWrapper);
		}

		if (this.player === null && this.playerWrapper.offsetParent !== null) {
			try {
				var player = videojs(this.playerWrapper, {
					autoplay: false,
					controls: this.config.controls,
					muted: "muted",
					preload: "none",
					width: this.config.width,
					height: this.config.height,
					fluid: true,
					liveui: true,
					loadingSpinner: false,
				});
				this.player = player;
			} catch (e) {
				this.clearNode('player');
				Log.error(e);
			}
		}
	},

	// Override function to retrieve DOM elements
	getDom: function () {
		if (this.wrapper === null) {
			this.wrapper = document.createElement("div");
			this.wrapper.classList.add("wrapper_" + this.name);
			this.wrapper.style.width = this.config.width + "px";
			this.wrapper.style.height = this.config.height + "px";
		}

		if (this.message !== null) {
			this.showMessage();
		} else {
			this.showPlayer();
		}

		return this.wrapper;
	},

	// Load scripts
	getScripts: function () {
		const __lang = this.config.lang || this.language || "en";
		return [
			this.file("js/video.min.js"),
			this.file("js/lang/" + (__lang) + ".js"),
			this.file("js/videojs-http-streaming.min.js"),
		];
	},

	// Load stylesheets
	getStyles: function () {
		return [
			this.file("css/video-js.css"),
			this.name + ".css",
		];
	},

	// Load translations files
	getTranslations: function () {
		//FIXME: This can be load a one file javascript definition
		return {
			en: "translations/en.json",
			es: "translations/es.json"
		};
	},
});
