(function () {

	window.hotSpots = [];

	var content = $('#content');
	var video = $('#webcam')[0];
	var canvases = $('canvas');

	var resize = function () {
		var ratio = video.width / video.height;
		var w = $(this).width();
		var h = $(this).height() - 110;

		if (content.width() > w) {
			content.width(w);
			content.height(w / ratio);
		} else {
			content.height(h);
			content.width(h * ratio);
		}
		canvases.width(content.width());
		canvases.height(content.height());
		content.css('left', (w - content.width()) / 2);
		content.css('top', ((h - content.height()) / 2) + 55);
	}
	$(window).resize(resize);
	$(window).ready(function () {
		resize();
	});

	function hasGetUserMedia() {
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
			navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}

    ///// Checks if users browser is compatible, if yes then fades in the instructions
	if (hasGetUserMedia()) {
		$('.introduction').fadeIn();
		$('.allow').fadeIn(); // ++
        $('.controlz').fadeIn();
	} else {
		$('.browsers').fadeIn();          //   If no then displays a message
		return;
	}

	var webcamError = function (e) {
		alert('Webcam error!', e);
	};

    ////////////////   (audio: false) - Stops Microphone getting sound input and feeding back
	if (navigator.getUserMedia) {
		navigator.getUserMedia({audio: false, video: true}, function (stream) {
			video.src = stream;
			initialize();
		}, webcamError);
	} else if (navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia({audio: false, video: true}, function (stream) {
			video.src = window.webkitURL.createObjectURL(stream);
			initialize();
		}, webcamError);
	}
    
    //  CREATE AUDIO CONTEXT  /////////////////////////
    var AudioContext = (
		window.AudioContext ||
		window.webkitAudioContext ||
		null
	);
    
    /////////////////   FX      /////////////////////////
    var soundContext = new AudioContext();
    var gainNode = soundContext.createGain();
    var filterD = soundContext.createBiquadFilter();
    var delay = soundContext.createDelay();
    var feedback = soundContext.createGain();

    gainNode.gain.value = 0.5;          // MASTER VOLUME
    delay.delayTime.value = 0;          // DELAY TIME
    feedback.gain.value = 0;            // FEEDBACK AMOUNT
    filterD.frequency.value = 1000;     // DELAY FEEDBACK FILTER
    
    ///////////////////////////////////////////////////
    ///////////////////////////////////////////////////

	var lastImageData;
	var canvasSource = $("#canvas-source")[0];
	var canvasBlended = $("#canvas-blended")[0];
	var contextSource = canvasSource.getContext('2d');
	var contextBlended = canvasBlended.getContext('2d');
	var bufferLoader;
	var samplebb = [];

	// mirror video
	contextSource.translate(canvasSource.width, 0);
	contextSource.scale(-1, 1);
    var c = 5;

    // (MAKE AUDIOCONTEXT ALERT)  //
	function initialize() {
		$('.introduction').fadeOut();
		$('.allow').fadeOut();
		$('.loading').delay(300).fadeIn(1200);
        setTimeout(loadSounds, 1000);
	}
    
    
    ///////////// SET UP SOUND BUFFERS ///////////////////////////////////////////
    
    function loadSounds() {
//		soundContext = new AudioContext();
		bufferLoader = new BufferLoader(soundContext,
			[
                'sounds/kik1.wav',      //0
                'sounds/kik2.wav',      //
                'sounds/snare1.wav',    //
                'sounds/hat1.wav',      //
                'sounds/cowbell1.wav',  //
                'sounds/conga1.wav',    //5
                'sounds/conga2.wav',    //
                'sounds/conga3.wav',    //
                'sounds/suspense1.wav', //
                'sounds/suspense2.wav', //
                'sounds/suspense3.wav', // 10
                'sounds/sheep.wav',     //
                'sounds/rooster.wav',   //
                'sounds/meow.wav',      //
                'sounds/moo.wav',       //
                'sounds/choir.wav',     // 15
                'sounds/roar1.wav',
                'sounds/dub1.wav',       //
                'sounds/dub2.wav',     // 
                'sounds/dub3.wav'
			],
			finishedLoading
		);
		bufferLoader.load();
	}
    
    function setNoteReady(obj) {
		obj.ready = true;
	}

    //////////////////////////////////////////////  !  i Must be size of Array!!
	function finishedLoading(bufferList) {
		for (var i=0; i<20; i++) {
			var source = soundContext.createBufferSource();
			source.buffer = bufferList[i];
			source.connect(soundContext.destination);
			var note = {
				note: source,
				ready: true,
				visual: $("#note" + i)
			};
			samplebb.push(note);
		}
		start();
        //console.log(notes);
	}

    
    ///////////////////     PLAY SOUNDS AND SET UP NODE GRAPH   //////////////
	function playSound(obj) {
		if (!obj.ready) return;
		var source = soundContext.createBufferSource();
		source.buffer = obj.note.buffer;
        
        delay.connect(feedback);                  //  FEEDBACK DELAY LOOP
        feedback.connect(filterD);                // 
        filterD.connect(delay);                   // 
    
        source.connect(delay);
        source.connect(gainNode);
        delay.connect(gainNode);                    //  MAIN VOLUME
        gainNode.connect(soundContext.destination); //  CONNECT OUTPUT TO SPEAKERS
        
        
		source.start(0);                           //  PLAY SOUND
		obj.ready = false;                        
		// throttle the note
		setTimeout(setNoteReady, 200, obj);  ////////////////** Sets note repeat time **
	}

    ///////////////////////////////////////////////////////////////////
    
	function start() {
		$('.loading').fadeOut();
		$('#hotSpots').fadeIn();
		$('body').addClass('black-background');
		$(".instructions").delay(600).fadeIn();
		$(canvasSource).delay(600).fadeIn();
		$(canvasBlended).delay(600).fadeIn();
		$('#canvas-highlights').delay(600).fadeIn();
		$(window).trigger('start');
      
		update();
	}

	window.requestAnimFrame = (function () {
		return window.requestAnimationFrame       ||
			   window.webkitRequestAnimationFrame ||
			   window.mozRequestAnimationFrame    ||
			   window.oRequestAnimationFrame      ||
			   window.msRequestAnimationFrame     ||
			function (callback) {
				window.setTimeout(callback, 1000 / 60);
			};
	})();

	function update() {
		drawVideo();
		blend();
		checkAreas();
		requestAnimFrame(update);
	}

	function drawVideo() {
		contextSource.drawImage(video, 0, 0, video.width, video.height);
	}

	function blend() {
		var width = canvasSource.width;
		var height = canvasSource.height;
		// get webcam image data
		var sourceData = contextSource.getImageData(0, 0, width, height);
		// create an image if the previous image doesn’t exist
		if (!lastImageData) lastImageData = contextSource.getImageData(0, 0, width, height);
		// create a ImageData instance to receive the blended result
		var blendedData = contextSource.createImageData(width, height);
		// blend the 2 images
		differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);
		// draw the result in a canvas
		contextBlended.putImageData(blendedData, 0, 0);
		// store the current webcam image
		lastImageData = sourceData;
	}

	function fastAbs(value) {
		// funky bitwise, equal Math.abs
		return (value ^ (value >> 31)) - (value >> 31);
	}

	function threshold(value) {
		return (value > 0x15) ? 0xFF : 0;
	}

	function difference(target, data1, data2) {
		// blend mode difference
		if (data1.length != data2.length) return null;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			target[4 * i] = data1[4 * i] == 0 ? 0 : fastAbs(data1[4 * i] - data2[4 * i]);
			target[4 * i + 1] = data1[4 * i + 1] == 0 ? 0 : fastAbs(data1[4 * i + 1] - data2[4 * i + 1]);
			target[4 * i + 2] = data1[4 * i + 2] == 0 ? 0 : fastAbs(data1[4 * i + 2] - data2[4 * i + 2]);
			target[4 * i + 3] = 0xFF;
			++i;
		}
	}

	function differenceAccuracy(target, data1, data2) {
		if (data1.length != data2.length) return null;
		var i = 0;
		while (i < (data1.length * 0.25)) {
			var average1 = (data1[4 * i] + data1[4 * i + 1] + data1[4 * i + 2]) / 3;
			var average2 = (data2[4 * i] + data2[4 * i + 1] + data2[4 * i + 2]) / 3;
			var diff = threshold(fastAbs(average1 - average2));
			target[4 * i] = diff;
			target[4 * i + 1] = diff;
			target[4 * i + 2] = diff;
			target[4 * i + 3] = 0xFF;
			++i;
		}
	}

	function checkAreas() {
		var data;
		for (var h = 0; h < hotSpots.length; h++) {
			var blendedData = contextBlended.getImageData(hotSpots[h].x, hotSpots[h].y, hotSpots[h].width, hotSpots[h].height);
			var i = 0;
			var average = 0;
			while (i < (blendedData.data.length * 0.25)) {
				// make an average between the color channel
				average += (blendedData.data[i * 4] + blendedData.data[i * 4 + 1] + blendedData.data[i * 4 + 2]) / 3;
				++i;
			}
			// calculate an average between the color values of the spot area
			average = Math.round(average / (blendedData.data.length * 0.25));
			if (average > 10) {                       /////**Sets Sensitivity**
				data = {confidence: average, spot: hotSpots[h]};
				$(data.spot.el).trigger('motion', data);
			}
		}
	}

	function getCoords() {
		$('#hotSpots').children().each(function (i, el) {
			var ratio = $("#canvas-highlights").width() / $('video').width();
			hotSpots[i] = {
				x:      this.offsetLeft / ratio,
				y:      this.offsetTop / ratio,
				width:  this.scrollWidth / ratio,
				height: this.scrollHeight / ratio,
				el:     el
			};
		});
	}

	$(window).on('start resize', getCoords);

	function highlightHotSpots() {
		var canvas = $("#canvas-highlights")[0];
		var ctx = canvas.getContext('2d');
		canvas.width = canvas.width;
		hotSpots.forEach(function (o, i) {
			ctx.strokeStyle = 'rgba(0,255,0,0.6)';
			ctx.lineWidth = 1;
			ctx.strokeRect(o.x, o.y, o.width, o.height);
		});
	}
    
    
    
///////////////////////     CONTROLS        //////////////////////////////////////////////    

    $('#gainSlider').on('input', function(){
        gainNode.gain.value = this.value;
});
    $('#delayTime').on('input', function(){
        delay.delayTime.value = this.value;
});
    $('#delayFeedback').on('input', function(){
        feedback.gain.value = this.value;
});
    $('#fCutoff').on('input', function(){
        filterD.frequency.value = this.value;
});
    
    
    ///////// CONTROLS THE CHANGING OF THE SAMPLES PLAYING. THE hs VARIABLES CHANGE THE IMAGE AND SOUND BUFFER SIMULTANEOUSLY. 

    var hs1 = 0;
    var hs2 = 2;
    var hs3 = 3;
    
     $("#one").click(function() {
     if(hs1 < 19){  
        hs1++;
        $(this).attr("src", "images/sound"+hs1+".jpg");
     } else{
        hs1 = 0;
        $(this).attr("src", "images/sound"+hs1+".jpg");
     }
});

     $("#two").click(function() {
         if(hs2 < 19){  
            hs2++;
            $(this).attr("src", "images/sound"+hs2+".jpg");
         } else{
            hs2 = 0;
            $(this).attr("src", "images/sound"+hs2+".jpg");
         }
});

     $("#three").click(function() {
         if(hs3 < 19){  
            hs3++;
            $(this).attr("src", "images/sound"+hs3+".jpg");
         } else{
            hs3 = 0;
            $(this).attr("src", "images/sound"+hs3+".jpg");
         }
});
    
    
///////////////////// MOTION EVENT LISTENERS FOR THE SAMPLER OBJECTS 
    
    (function(){
	$(window).on('motion', function(ev, data){
		var spot = $(data.spot.el);
		spot.addClass('active');
		setTimeout(function(){
			spot.removeClass('active');
		}, 200);                  //  Makes image dissapear/flash briefly when triggered
	});
        
	$('#one').on('motion', function(){
        playSound(samplebb[hs1]);
	});
	$('#two').on('motion', function(){
        playSound(samplebb[hs2]);
	});
    $('#three').on('motion', function(){
        playSound(samplebb[hs3]);
	});
               
})();
                        
})();