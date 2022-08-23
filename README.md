# MMM-WyzeBridge

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

This module connects to a [Wyze-Bridge](https://github.com/mrlt8/docker-wyze-bridge) server instance and rotate trough registered cameras using [Video.js](https://github.com/videojs/video.js) and [videojs-http-streaming (VHS)](https://github.com/videojs/http-streaming) to be used even within browsers not supporting video tags.

## Example

![](.github/example.png)

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
var config = {
    modules: [
        {
            module: 'MMM-WyzeBridge',
            config: {
                updateInterval: 30000, // Default time to show next camera (in milliseconds)
                retryDelay: 5000, // Time to ask to wyze-bridge server for cameras updates (in milliseconds)
                controls: false, // If video player should show its controls
                height: 350, // video player height
                width: 700, // video player width
                targetHost: null, // wyze-bridge host to connect (e.g "http://localhost")
                targetPort: null, // wyze-bridge port to connect (e.g 5000)
                animationSpeed: 400, // Animation speed to update DOM
                filter: [], // camera filter (see below)
            }
        }
    ]
}
```

## Configuration options

| Option           | Default | Description                                                                        |
|------------------|---------|------------------------------------------------------------------------------------|
| `updateInterval` | `30000` | *Optional* Default time to show next camera (in milliseconds)                      |
| `retryDelay`     | `5000`  | *Optional* Time to ask to wyze-bridge server for cameras updates (in milliseconds) |
| `controls`       | `false` | *Optional* If video player should show its controls                                |
| `height`         | `350`   | *Optional* video player height                                                     |
| `width`          | `700`   | *Optional* video player width                                                      |
| `targetHost`     | `null`  | *Required* wyze-bridge host to connect (e.g `"http://localhost"`)                  |
| `targetPort`     | `null`  | *Required* wyze-bridge port to connect (e.g 5000)                                  |
| `animationSpeed` | `400`   | *Optional* Animation speed to update DOM                                           |
| `filter`         | `[]`    | *Optional* camera filter (see below)                                               |

### Filtering
Use of *filter* option reduce the amount of cameras to show in player. An empty list means no filtering (use all cameras retrieved). **USE CAREFULLY**.

This option can receive a list of camera names:
```js
    config: {
        ...
        filter: ["cam1", "cam2", ...],
        ...
    }
```
a list of patterns:
```js
    config: {
        ...
        filter: ["/^cam-(1|2).*$/", ...],
        ...
    }
```
or a list of RegExp objects:
```js
    config: {
        ...
        filter: [new RegExp("/^cam-(1|2).*$/"), ...],
        ...
    }
```
