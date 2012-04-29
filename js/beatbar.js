  // globals: soundManager, key, window
  function Beatbar() {
    // Private variables
    var self = this,
        sm = soundManager,
        cursorLocation = 0, // current location of pointer in the bar
        lastPageX = 0,
        playerState,
        PLAYING = 0,
        STOPPED = 1,
        PAUSED = 2,
        lastUpdatedAt = 0,
        location = window.location,
        isWindowInFocus = true, // tracks the focus of player window
        progressString = '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        progressStringLength = progressString.length,
        loadingString = progressString.replace(/~/gi,'='),
        playControl = {
          0: '~||~', // playing
          1: '~(>~', // paused
          2: '~(>~'  // stopped
        },
        previousControl = '~~|<)~',
        nextControl = '~(>|~~',
        separator = '|',
        playerStringLength = progressStringLength + 
          playControl[0].length +
          previousControl.length +
          nextControl.length +
          separator.length,
        screenWidth = $(document).width(),
        delta = Math.floor(screenWidth/(playerStringLength*2)),
        vu = '~~~~~~~~~~',
        dummyPlayerString = previousControl +
          playControl[0] +
          nextControl +
          separator +
          progressString;

    // Configuration options    
    // Default config object is defined here
    // This can be overridden by User
    this.config = {
      usePeakData: true,
      cursorChar: 'O', // caracter for representing mouse position in beatbar
      progressChar: 'o', // character for showing progress of the current song
      playlist: []
    };
    
    // Contains the current sound object
    this.sound = {};
    
    // Contains all created sound objects
    this.playlist = {};
    
    // Bind events on document click, mousemove and other keyboard shortcuts
    this.bindEvents = function() {
      $(document).ready(function() {
        $(document).click(self.clickHandler);
        $(document).bind('mousemove',self.mouseMoveHandler);
        $(window).resize(self.windowResizeHandler);
        // Don't render player if the window is not in focus
        $(window).focus(function() {
            isWindowInFocus = true;
          }).blur(function() {
            isWindowInFocus = false;
          });
        // Keybindings
        key('n, j', function(){
          self.playNext();
        });
        key('p, k', function(){
          self.playPrevious();
        });
        key('space', function(e){
          e.preventDefault();
          self.togglePlay();
        });
        key('right', function(){
          self.seekForward();
        });
        key('left', function(){
          self.seekBackward();
        });
        key('home 0', function(){
          self.seekToBeginning();
        });
        key('up', function(e){
          e.preventDefault();
          self.increaseVolume();
        });
        key('down', function(e){
          e.preventDefault();
          self.decreaseVolume();
        });
      });
    };
    
    // Click event handler
    // Get the x coordinate of the click from event object
    // translate it into URL string index
    // according to the value of index
    // perform different functions
    this.clickHandler = function(e) {
      var location = self.translatePointerLocation(e);
      if (location > 2 && location < 5){
        self.playPrevious();
      } else if (location > 6 && location < 9){
        self.togglePlay();
      } else if (location > 10 && location < 14){
        self.playNext();
      } else if (location > 16) {
        self.seekTo(location);
      }
    };
    
    // Set screenWidth and delta when the window is resized
    this.windowResizeHandler = function(e) {
      screenWidth = $(document).width();
      delta = Math.floor(screenWidth/(playerStringLength*2));
      sm._writeDebug('Screen resized. New values:');
      sm._writeDebug('screenWidth: ' + screenWidth);
      sm._writeDebug('delta: '+ delta);
    };
    
    // Toggle play and pause for the current sound object
    this.togglePlay = function() {
      switch (playerState){
        case PLAYING:
          self.sound.pause();
          break;
        case PAUSED:
          self.sound.resume();
          break;
        case STOPPED:
          self.sound.play();
          break;
        default:
          // throw exception
          sm._writeDebug('Something bad happened');
      }
    };
    
    // Handler for progress section
    //   Translates the location into time in milliseconds
    //   then sets the position of current sound object to
    //   translated time
    // Parameters:
    //   location (Integer) - index of character in the URL bar
    // 
    this.seekTo = function(location) {
      // @todo due to integer division, the location is not calculated correctly
      self.sound.setPosition(((location - 16.1)/progressStringLength)*self.sound.durationEstimate);
    };
    
    // Seeks the current sound object forward by specified time
    // Parameters:
    //   seekBy (Integer) - time in milliseconds by which the sound should
    //     be seeked forward. Default 5000
    this.seekForward = function(seekBy){
      seekBy = seekBy || 5000;
      self.sound.setPosition(self.sound.position + seekBy);
    };
    
    // Seeks the current sound object forward by specified time
    // Parameters:
    //   seekBy (Integer) - time in milliseconds by which the sound should
    //   be seeked backward. Default 5000
    this.seekBackward = function(seekBy){
      seekBy = seekBy || 5000;
      self.sound.setPosition(self.sound.position - seekBy);
    };
    
    // Seeks the position of current sound object to beginning of the sound
    this.seekToBeginning = function(){
      self.sound.setPosition(0);
    };
    
    // Increase the volume of current sound object by the specified amount
    //   on a scale of 0-100
    // Parameters:
    //   increaseBy (Integer) - volume to be increased by specified percentage
    this.increaseVolume = function(increaseBy){
      increaseBy = increaseBy || 10;
      if (self.sound.volume <= 100 - increaseBy){
        self.sound.setVolume(self.sound.volume + increaseBy);
      }
    };
    
    // Decrease the volume of current sound object by the specified amount
    //   on a scale of 0-100
    // Parameters:
    //   decreaseBy (Integer) - volume to be decreased by specified percentage
    this.decreaseVolume = function(decreaseBy){
      decreaseBy = decreaseBy || 10;
      if (self.sound.volume >= decreaseBy){
        self.sound.setVolume(self.sound.volume - decreaseBy);
      }
    };
    
    // handlers for sound events
    // @todo refactor to use playState of soundObject
    // @todo id3 data show
    this.events = {
      play: function(e) {
        playerState = PLAYING;
        self.renderPlayer();
      },
      stop: function(e) {
        playerState = STOPPED;
        self.renderPlayer();
      },
      pause: function(e) {
        playerState = PAUSED;
        self.renderPlayer();
      },
      resume: function(e) {
        playerState = PLAYING;
        self.renderPlayer();
      },
      finish: function(e) {
        self.playNext();
        self.renderPlayer();
      },
      // @todo throttle settings
      whileloading: function(e) {
        self.renderPlayer();        
      },
      onload: function(e) {
        if (self.sound.readyState == 2) {
          //failed to load
          self.renderPlayer();
        }
      },
      whileplaying: function(e) {
        //throttle for whileplaying calls
        var d = new Date();
        if (d - lastUpdatedAt > 50){
          lastUpdatedAt = d;
          self.renderPlayer();
        }
      },
      id3: function(){
      } 
    };
  
    
    // Handle mouse move event
    this.mouseMoveHandler = function(e) {
      // Dont excessively call renderPlayer on mousemove event
      // lastPageX - cached mouse pointer position on last move and render
      if (e.pageX > lastPageX + delta || e.pageX < lastPageX - delta) {
        lastPageX = e.pageX;
        // change cursor location
        cursorLocation = self.translatePointerLocation(e);
        self.renderPlayer();
      }
    };
    
    // Main method responsible for rendering the player in address bar
    this.renderPlayer = function() {
      if (!isWindowInFocus) {
        return;
      }
      var controlString = self.renderControlString(),
        errorMessage = 'Failed to load the sound. Security / 404 / Bad format',
        playerString;
      // show error if there is a failure
      if (self.sound.readyState == 2){
        playerString = controlString + separator + '[' + 
          errorMessage + ']';  
      } else {
        var progress = self.renderProgressString(),
          timeString = self.renderTimeString();
        // dont write vuString if usePeakData not supported
        if (self.config.usePeakData) {
          vuString = vu.slice(0, Math.floor(self.sound.peakData.left * 10));
        } else {
          vuString = '';
        }
        playerString = controlString + separator + progress + separator + 
          timeString + separator + vuString;
      }
      location.replace('#' + playerString.substr(0, cursorLocation) +
        self.config.cursorChar + 
        playerString.substr(cursorLocation + self.config.cursorChar.length));
    };
    
    // Returns controls string
    this.renderControlString = function() {
      return previousControl + playControl[playerState] + nextControl;
    };
    
    // Returns progress string
    // @todo rework the logic below
    this.renderProgressString = function() {
      var location = Math.floor((self.sound.position/self.sound.durationEstimate)*progressStringLength),
        loaded = Math.floor((self.sound.bytesLoaded/self.sound.bytesTotal)*progressStringLength),
        string = loadingString.substr(0,loaded) + progressString.substr(loaded);
      return string.substr(0, location) +
        self.config.progressChar + 
        string.substr(location + self.config.progressChar.length);
    };
    
    // Returns the remaining time string
    // @todo cache time for one second
    this.renderTimeString = function() {
      var timeLeft = self.sound.durationEstimate - self.sound.position;
      return '[-' + self.getTime(timeLeft) + ']';
    };
    
    // Translates mouse pointer location into player string cursor
    this.translatePointerLocation = function(e) {
      return Math.floor((e.pageX/screenWidth)*playerStringLength);
    };
    
    // create soudnManager sound object
    //   and returns it
    // @todo refactor to use getSoundById() here
    this.createSound = function(id, url) {
      var thisSound;
      // if id exist in self.playlist, return the corresponding sound object
      // already created
      if (self.playlist[id]){
        thisSound = self.playlist[id];
      } else {
        // create sound
        thisSound = sm.createSound({
          id:'awesome'+id,
          url:url,
          onplay:self.events.play,
          onstop:self.events.stop,
          onpause:self.events.pause,
          onresume:self.events.resume,
          onfinish:self.events.finish,
          whileloading:self.events.whileloading,
          whileplaying:self.events.whileplaying,
          onid3:self.events.id3,
          onload:self.events.onload,
          autoPlay: false
        });
        self.playlist[id] = thisSound;
      }
      return thisSound;
    };
    
    // Play the next sound object in the playlist and return it
    this.playNext = function(){
      var next;
      if (self.playlist.currentlyPlaying + 1 >= self.config.playlist.length){
        next = 0;
      } else {
        next = self.playlist.currentlyPlaying + 1;
      }
      return self.playById(next);
    };
    
    // Play the previous sound object in the playlist and return it
    this.playPrevious = function(){
      // get previous
      var previous;
      if (self.playlist.currentlyPlaying - 1 < 0){
        previous = self.config.playlist.length - 1;
      } else {
        previous = self.playlist.currentlyPlaying - 1;
      }
      return self.playById(previous);
    };
    
    // Play the sound object with id as id
    // Parameters:
    //   id (Integer) - playlist id of the sound object to be played
    this.playById = function(id){
      if (self.sound.sID) {
        self.sound.stop();
        self.sound.unload();
      }
      if (self.config.playlist[id]) {
        self.playlist.currentlyPlaying = id;
        self.sound = self.createSound(id, self.config.playlist[id]);
        self.sound.play();
        return self.sound;
      }
    };
    
    // converts milliseconds into human readable form
    // @todo variable names
    this.getTime = function(milliseconds){
      var seconds = Math.floor(milliseconds/1000),
          minutes = Math.floor(seconds/60);
      seconds = seconds - (minutes*60);
      return minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
    };
    
    // Initialize the player
    this.init = function (config) {
      var sound;
      if (config) {
        $.extend(this.config, config);
      }
      
      // Check if flash version is greate than 9
      // if yes, then set sm.defaultOptions.usePeakData to true
      
      if (sm.flashVersion >= 9) {
        sm.defaultOptions.usePeakData = this.config.usePeakData;
      }

      self.playById(0);
      self.bindEvents();
    };
    
  }