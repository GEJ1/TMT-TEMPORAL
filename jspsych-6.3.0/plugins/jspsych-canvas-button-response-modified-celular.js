/**
 * jspsych-canvas-button-response
 * Chris Jungerius (modified from Josh de Leeuw)
 *
 * a jsPsych plugin for displaying a canvas stimulus and getting a button response
 *
 * documentation: docs.jspsych.org
 *
 **/

jsPsych.plugins["canvas-button-response-modified-celular"] = (function () {
  var plugin = {};

  plugin.info = {
    name: "canvas-button-response-modified-celular",
    description: "",
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.FUNCTION,
        pretty_name: "Stimulus",
        default: undefined,
        description:
          "The drawing function to apply to the canvas. Should take the canvas object as argument.",
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Prompt",
        default: null,
        description: "Any content here will be displayed under the button.",
      },
      stimulus_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Stimulus duration",
        default: null,
        description: "How long to hide the stimulus.",
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: "Trial duration",
        default: null,
        description: "How long to show the trial.",
      },
      margin_vertical: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Margin vertical",
        default: "0px",
        description: "The vertical margin of the button.",
      },
      margin_horizontal: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: "Margin horizontal",
        default: "8px",
        description: "The horizontal margin of the button.",
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: "Response ends trial",
        default: true,
        description: "If true, then trial will end when user responds.",
      },
      canvas_size: {
        type: jsPsych.plugins.parameterType.INT,
        array: true,
        pretty_name: "Canvas size",
        default: [500, 500],
        description:
          "Array containing the height (first value) and width (second value) of the canvas element.",
      },
      canvas_background_color: {
        type: jsPsych.plugins.parameterType.STRING,
        default: "grey",
        description: "The background color of the canvas.",
      },
    },
  };

  plugin.trial = function (display_element, trial) {
    // create canvas
    let html =
      '<div id="jspsych-canvas-button-response-stimulus">' +
      '<canvas id="jspsych-canvas-stimulus" class="jspsych-canvas" width=' +
      trial.canvas_size[0] +
      " height=" +
      trial.canvas_size[1] +
      ' style="background-color:' +
      trial.canvas_background_color +
      "; border: 2px solid black" +
      ';"></canvas>' +
      "</div>";

    //global variables
    let x = 0;
    let y = 0;
    isDrawing = false;

    // data
    let pos_tracking = [];
    let cursor_time = [];

    //show prompt if there is one
    if (trial.prompt !== null) {
      html += trial.prompt;
    }
    display_element.innerHTML = html;

    //draw
    let c = document.getElementById("jspsych-canvas-stimulus");
    const ctx = c.getContext("2d");
    trial.stimulus(c);

    // start time
    var start_time = performance.now();

    // add listeners for draw and mouse tracking
    c.addEventListener("touchend", mouseUpFunc);

    c.addEventListener("touchstart", (e) => {
      var bcr = e.target.getBoundingClientRect();
      x = e.pageX - bcr.x;
      y = e.pageY - bcr.y;
      isDrawing = true;
    });

    c.addEventListener("touchmove", function (e) {
      if (isDrawing === true) {
        var bcr = e.target.getBoundingClientRect();
        drawLine(
          ctx,
          x,
          y,
          e.touches[0].pageX - bcr.x,
          e.touches[0].pageY - bcr.y
        );
        x = e.touches[0].pageX - bcr.x;
        y = e.touches[0].pageY - bcr.y;
      }
      mouseMove(e);
    });

    c.addEventListener("touchend", (e) => {
      if (isDrawing === true) {
        var bcr = e.target.getBoundingClientRect();
        drawLine(
          ctx,
          x,
          y,
          e.touches[0].pageX - bcr.x,
          e.touches[0].pageY - bcr.y
        );
        x = 0;
        y = 0;
        isDrawing = false;
      }
    });

    function mouseMove(e) {
      var rect = c.getBoundingClientRect(), // abs. size of element
        scaleX = c.width / rect.width, // relationship bitmap vs. element for X
        scaleY = c.height / rect.height; // relationship bitmap vs. element for Y

      var x_loca = (e.touches[0].clientX - rect.left) * scaleX;
      var y_loca = (e.touches[0].clientY - rect.top) * scaleY;
      var coor = "(" + x + "," + y + ")";
      // console.log(coor);
      checkForDot(x_loca, y_loca, RADIUS, isDrawing, ctx, dots_coord);
      pos_tracking.push(coor); //Save coor in array pos_tracking

      //timer for cursor

      let startTime = Math.round(performance.now());

      //start_time was declared at begining of the trial
      let time_in_trial = Math.round(startTime - start_time);

      //cursor time is an array with the time measurement for every [x,y] position relative to the start of the trial
      cursor_time.push(time_in_trial);
    }

    function drawLine(ctx, x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.strokeStyle = trial.drawline_color; // drawLine color
      ctx.lineWidth = trial.lineWidth;
      ctx.lineCap = "round";
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
    }

    function mouseUpFunc(e) {
      let release_click_time;

      release_click_time = performance.now();

      var bcr = e.target.getBoundingClientRect();
      if (isDrawing === true) {
        drawLine(ctx, x, y, e.pageX - bcr.x, e.pageY - bcr.y);
        x = 0;
        y = 0;
        isDrawing = false;
      }

      let info = {
        key: -1,
        rt: release_click_time - start_time,

        // clickX: e.touches[0].pageX - bcr.x,
        // clickY: e.touches[0].pageY - bcr.y,
        pos_tracking: pos_tracking,
        cursor_time: cursor_time,
      };

      after_response(info);
    }

    // store response
    var response = {
      rt: null,
      button: null,
      X_click: null,
      Y_click: null,
    };

    // function to handle responses by the subject
    function after_response(choice) {
      // measure rt
      var end_time = performance.now();
      var rt = end_time - start_time;
      response.button = parseInt(choice);
      response.rt = rt;

      if (trial.response_ends_trial) {
        end_trial();
      }
    }

    // function to end trial when it is time
    function end_trial() {
      jsPsych.pluginAPI.clearAllTimeouts(); // kill any remaining setTimeout handlers

      // gather the data to store for the trial
      var trial_data = {
        rt: response.rt,
        response: response.button,
        X_click: response.clickX,
        Y_click: response.clickY,
        position: pos_tracking,
        cursor_time: cursor_time,
      };
      c.removeEventListener("touchend", mouseUpFunc);

      // clear the display
      display_element.innerHTML = "";

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    }

    // hide image if timing is set
    if (trial.stimulus_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function () {
        display_element.querySelector(
          "#jspsych-canvas-button-response-stimulus"
        ).style.visibility = "hidden";
      }, trial.stimulus_duration);
    }

    function after_response(info) {
      // only record the first response
      if (response.key == null) {
        response = info;
      }

      if (trial.response_ends_trial) {
        end_trial();
      }
    }

    // end trial if time limit is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function () {
        end_trial();
      }, trial.trial_duration);
    }
  };

  return plugin;
})();
