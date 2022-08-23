/* Magic Mirror
 * Node Helper: "MMM-WyzeBridge"
 *
 * By Andrés Vanegas <ukab72106@gmail.com>
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const Log = require("../../js/logger.js");
const { createProxyMiddleware } = require("http-proxy-middleware");
const axios = require("axios").default;
const nocache = require('nocache');

module.exports = NodeHelper.create({
	name: "MMM-WyzeBridge",
	urlPrefix: null,
	logPrefix: "MMM-WyzeBridge :: ",
	allowedKeys: [
		"connected",
		"enabled",
		"firmware_ver",
		"name_uri",
		"nickname",
		"product_model",
		"status"
	],
	index: 0,
	cameras: [],
	readyState: false,

	start: function () {
		this.config = null;
		this.readyState = false;
		Log.info(this.logPrefix + "Started");
		this.sendNotification("SET_MESSAGE", "LOADING");
	},

	sendNotification(notification, payload) {
		this.sendSocketNotification(this.name + "-" + notification, payload);
	},

	socketNotificationReceived: function (notification, payload) {
		var self = this;
		notification = notification.replace(this.name + "-", "");

		switch (notification) {
			case "SET_CONFIG":
				if (this.config === null) {
					Log.info(this.logPrefix + "Working notification system. Notification:", notification, "payload: ", payload);
					this.config = payload;
					this.urlPrefix = this.config.__protocol + "//localhost:" + this.config.__port + "/" + this.name;
					this.setProxy();
					this.swapCamera();
				} else {
					this.showCamera();
				}

				break;
		}
	},

	// this you can create extra routes for your module
	setProxy: function () {
		var self = this;
		this.expressApp.set("etag", false);
		this.expressApp.use("/" + this.name + "/proxy/*",
			nocache(),
			createProxyMiddleware({
				target: this.config.targetHost + ":" + this.config.targetPort, // target host with the same base path
				changeOrigin: true, // needed for virtual hosted sites
				pathRewrite: function (path, _) {
					return path.replace(new RegExp("^/" + self.name + "/proxy/"), "/");
				},
			})
		);

		this.expressApp.use("/" + this.name + "/stream/*",
			nocache(),
			createProxyMiddleware({
				target: this.config.targetHost + ":8888", // target host with the same base path
				changeOrigin: true, // needed for virtual hosted sites
				pathRewrite: function (path, _) {
					return path.replace(new RegExp("^/" + self.name + "/stream/"), "/");
				},
			})
		);

		this.getCameras();
	},

	processCameras: function (data) {
		var self = this;
		if (typeof data !== "object" || !data.hasOwnProperty("cameras")) {
			data = { cameras: {} };
		}

		var cameras = [];
		for (var cameraName in data.cameras) {
			const __canShowCamera = (
				// All cameras should be shown or
				this.config.filter == 0
				// Camera match exactly a filter as string
				|| this.config.filter.includes(cameraName)
				// Camera match a valid pattern
				|| this.config.filter.map(p => new RegExp(p, "gi")).some(p => cameraName.match(p))
			);
			if (__canShowCamera) {
				var cameraData = {
					image_url: "/proxy/" + data.cameras[cameraName].snapshot_url,
					video_url: "/stream/" + data.cameras[cameraName].name_uri + "/stream.m3u8",
				};
				for (camAttribute of this.allowedKeys) {
					cameraData[camAttribute] = data.cameras[cameraName][camAttribute];
				}
				cameras.push(cameraData);
			}
		}
		cameras.sort(function (a, b) {
			if (a.nickname < b.nickname) { return -1; }
			if (a.nickname > b.nickname) { return 1; }
			return 0;
		});

		camerasReceived = cameras.map(x => x.nickname);
		camerasAlreadyDetected = this.cameras.map(x => x.nickname);

		var removedCameras = camerasAlreadyDetected.filter(x => !camerasReceived.includes(x));
		var newCameras = camerasReceived.filter(x => !camerasAlreadyDetected.includes(x));
		if (newCameras.length + removedCameras.length > 0) {
			Log.info(self.logPrefix + "Changes received in cameras");
			this.cameras = cameras;
			this.index = this.index > (this.cameras.length - 1) ? 0 : this.index;
			newCameras.forEach(x => Log.log(self.logPrefix + x + " camera detected"));
			removedCameras.forEach(x => Log.log(self.logPrefix + x + " camera removed"));
		}
	},

	changeIndex: function () {
		if (this.readyState && this.cameras.length > 0) {
			if (this.index < (this.cameras.length - 1)) {
				this.index++;
			} else {
				this.index = 0;
			}
		}
	},

	showCamera: function () {
		var self = this;
		if (!this.readyState) {
			Log.info(this.logPrefix + "Still loading");
			this.sendNotification("SET_MESSAGE", "LOADING");
		}
		else if (this.cameras.length == 0) {
			Log.info(this.logPrefix + "No cameras found. skipping");
			this.sendNotification("SET_MESSAGE", "NO_CAMS");
		}
		else {
			Log.info(this.logPrefix + "Showing camera " + this.cameras[this.index].nickname);
			this.sendNotification("SET_CAMERA", this.cameras[this.index]);
		}
	},

	swapCamera: function () {
		var self = this;
		this.showCamera();
		this.changeIndex();

		setTimeout(function () {
			self.swapCamera();
		}, this.readyState ? this.config.updateInterval : this.config.retryDelay);
	},

	// Test another function
	getCameras: function () {
		var self = this;

		Log.log(self.logPrefix + "Requesting cameras...");
		axios.get(this.urlPrefix + "/proxy/cameras")
			.then(function (response) {
				self.processCameras(response.data);
			})
			.catch(function (error) {
				self.cameras = [];
				Log.error(self.logPrefix + error.message);
			})
			.then(function () {
				self.readyState = true;
				self.sendNotification("READY_STATE", self.readyState);
				self.sendNotification("CAMERAS_UPDATED", self.cameras.length);

				Log.log(self.logPrefix + "Request cameras finished");
				setTimeout(function () { self.getCameras(); }, self.config.retryDelay);
			});
	}
});
