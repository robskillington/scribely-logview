(function ($) {
  "use strict";

  // Extensions
  $.extend($.expr[':'], {
    'contains-ci': function(elem, i, match, array)  {
      return (elem.textContent || elem.innerText || $(elem).text() || '')
        .toLowerCase().indexOf((match[3] || '').toLowerCase()) >= 0;
    }
  });

  var Logview = (function () {
    var LOGVIEW_KEEP_MAX = 1000;
    var LOGVIEW_SHOW_MAX = 200;
    var ANIM_SPEED = 150;
    var LOG_LEVELS = ['verbose', 'info', 'warning', 'error'];

    var self = {
      logs: [],
      rowsContainer: null,
      rowTemplate: null,
      paused: false,
      activeFilterText: '',
      activeFilterLogLevel: ['verbose', 'info', 'warning', 'error'],

      init: function () {
        self.rowsContainer = $('#logviewrows');

        var socket = io.connect('http://' + window.location.host);

        var source = $('#row-template').html();
        self.rowTemplate = Handlebars.compile(source);

        socket.on('logadd', self.on.logadd);

        self.bindings();
      },

      bindings: function () {
        var playPauseButton = $('#play-pause-button');

        playPauseButton.on('click', function (e) {
          e.preventDefault();
          if (!self.paused) {
            self.paused = true;
            playPauseButton.text('Click to resume').removeClass('btn-success').addClass('btn-inverse');
          } else {
            self.paused = false;
            $('.hiddenbypause').removeClass('hiddenbypause');
            $('.logview.row:hidden:not(.filteredout)').fadeIn(ANIM_SPEED);
            playPauseButton.text('Click to pause').addClass('btn-success').removeClass('btn-inverse');
          }
        });

        var filterByText = $('#filter-log-text');

        filterByText.on('keyup', function (e) {
          var input = _.str.trim(filterByText.val());
          self.activeFilterText = input.toLowerCase();
          self.runFilter();
        });

        filterByText.focus();

        var logLevelCheckboxes = $('input[type=checkbox].checkbox-loglevel');

        logLevelCheckboxes.on('change', function () {
          var checkbox = $(this);
          var level = checkbox.val();
          var checked = checkbox.is(':checked');

          if (checked && !_.contains(self.activeFilterLogLevel, level)) {
            self.activeFilterLogLevel.push(level);
            self.runFilter();
          } else if (!checked && _.contains(self.activeFilterLogLevel, level)) {
            self.activeFilterLogLevel = _.without(self.activeFilterLogLevel, level);
            self.runFilter();
          }
        });
      },

      parse: function (packet) {
        packet.Created = new Date(parseInt(packet.UtcCreated));
        return packet;
      },

      getLogLabel: function (level) {
        switch (level.toLowerCase()) {
          case 'verbose':
            return 'label-success';
          case 'info':
            return 'label-info';
          case 'warning':
            return 'label-warning';
          case 'error':
            return 'label-important';
        }
        return '';
      },

      shouldDisplay: function (row) {
        if (self.activeFilterText.length < 1) {
          return true;
        }

        return row.is(':contains-ci(' + self.activeFilterText + ')');
      },

      runFilter: function () {
        $('.filteredout').removeClass('filteredout');

        // filter by text
        if (self.activeFilterText.length > 0) {
          $('.logview.row:not(:contains-ci(' + self.activeFilterText + '))').addClass('filteredout');
        }

        var intersect = _.intersection(self.activeFilterLogLevel, LOG_LEVELS);

        // filter out unselected log levels if applicable
        if (intersect.length != LOG_LEVELS.length) {
          var toFilter = _.difference(LOG_LEVELS, self.activeFilterLogLevel);

          _.each(toFilter, function (level) {
            $('.logview.row[data-loglevel=' + level + ']').addClass('filteredout');
          });
        }
      },

      on: {
        logadd: function (packet) {
          var log = self.parse(packet);

          // Only keep LOGVIEW_KEEP_MAX backlog
          while (self.logs.length > LOGVIEW_KEEP_MAX) {
              self.logs.shift();
          }

          var showing = $('.logview.row');

          // Remove any from view that is overflowing
          if (showing.length > LOGVIEW_SHOW_MAX) {
            var greaterThanIndex = LOGVIEW_SHOW_MAX - 1;
            $('.logview.row:gt(' + greaterThanIndex + ')').remove();
          }

          console.log(log);

          var html = self.rowTemplate({
            body: JSON.stringify(log.LogContent),
            loglevel: log.LogLevel.toUpperCase(),
            loglabel: self.getLogLabel(log.LogLevel),
            when: $.localtime.toLocalTime(log.Created.toISOString(), 'h:mm:ssa d MMM yyyy')
          });

          var container = $('<span></span>').html(html);

          var row = container.find('.row').hide();
          row.attr('data-loglevel', log.LogLevel.toLowerCase());

          if (self.paused) {
            row.addClass('hiddenbypause');
          }

          var shouldDisplay = self.shouldDisplay(row);

          if (!shouldDisplay) {
            row.addClass('filteredout');
          }

          self.rowsContainer.prepend(row);

          if (!self.paused && shouldDisplay) {
            row.slideDown(ANIM_SPEED);
          }
        }
      }
    };
    return self;
  })();

  // On domready init()
  $(Logview.init);
})(jQuery);
