/**
 * # Harmony
 * ### ***DFP JavaScript API Helper***
 */

var Util = require('./util.js'),
    AdSlot = require('./adslot.js'),
    log = require('./log.js'),
    slots = require('./slot-set.js'),
    groups = require('./group-set.js'),
    BaseClass = require('baseclassjs'),
    Eventable = require('./event-handler.js'),
    watcher = require('./breakpoint-watcher.js');

/**
 * ## Harmony()
 * Create a new instance of Harmony.
 * @param {Boolean} [opts.forceLog] True to force Lumberjack logging enabled.
 * @return {Object} Instance of Harmony.
 */
module.exports = function (opts) {
    opts = opts || {};
    if (opts.forceLog) {    
        log.enable();
    }
    log('init', 'Harmony defined.');

    return BaseClass({
        _create: function () {
            var that = this;
            /**
             * ## harmony.on('breakpoint/update', callback)
             * ```javascript
             * harmony.on('breakpoint/update', function (bp) {});
             * harmony.one('breakpoint/update', function (bp) {});
             * harmony.off('breakpoint/update', function (bp) {});
             * ```
             * @param {Function} callback Called on new breakpoint.
             * @see event-handler.js
             */
            watcher.on('update', function (bp) {
                that.trigger('breakpoint/update', bp);
            });
            /**
             * ## harmony.on('slotRenderEnded', callback)
             * @param {Function} callback Called each time any ad call completes.
             * @see event-handler.js
             */
            try {
                global.googletag.pubads().addEventListener('slotRenderEnded', function (event) {
                    that.trigger('slotRenderEnded', event);
                });
            } catch (err) {
                log('error', 'It appears "googletag" is not defined!');
            }
        },
        /**
         * ## harmony.version
         * @type {String}
         */
        version: '3.3.1',
        /**
         * ## harmony.load(opts)
         * Load a block of configuration.
         * @param {Object} [opts.targeting] System-level targeting.
         * @param {Array of Objects} [opts.slots] Set of ad slot configurations.
         * @param {Number|Array of Numbers} [opts.breakpoints] Set of breakpoints.
         * @see adslot.js
         */
        load: function (opts) {
            var pubads = global.googletag.pubads();

            opts = opts || {};
            opts.slots = opts.slots || [];

            // Generate the ad slots.
            var i, slot, conf,
                len = opts.slots.length;
            log('load', 'Generating ad slots.');
            for (i = 0; i < len; i += 1) {
                conf = opts.slots[i];
                try {
                    slot = AdSlot(
                        pubads,
                        Util.scrubConf(conf)
                    );
                    slots.add(slot);
                    groups.add(slot.group, slot);
                } catch (err) {
                    log('error', {
                        msg: 'Slot failed to load during call to load().',
                        conf: conf,
                        err: err
                    });
                }
            }

            // Assign the system targeting.
            var key, value,
                targeting = opts.targeting || {};
            log('load', 'Applying pubads targeting.');
            for (key in targeting) {
                value = targeting[key];
                log('load', '- ' + key + ' = ' + value);
                pubads.setTargeting(key, value);
            }

            // Assign the breakpoints.
            watcher.add(opts.breakpoints);

            log('load', 'Harmony config loaded.');
        },
        /**
         * ## harmony.addBreakpoints(set)
         * Add breakpoint values in pixels.
         * @param {Number|Array of Numbers} [set] Breakpoints in pixels.
         * @see breakpoint-watcher.js
         */
        addBreakpoints: watcher.add,
        /**
         * ## harmony.getBreakpoints()
         * Fetch the list of breakpoints already loaded into the system.
         * @return {ArrayOfNumber}
         * @see breakpoint-watcher.js
         */
        getBreakpoints: watcher.getAll,
        /**
         * ## harmony.breakpoint()
         * Fetch the current breakpoint.
         * @return {Number}
         * @see breakpoint-watcher.js
         */
        breakpoint: watcher.current,
        /**
         * ## harmony.log
         * Instance of Lumberjack populated with Harmony's data.
         * @see log.js
         */
        log: log,
        /**
         * ## harmony.slot(name)
         * Safely fetch an existing ad slot or a mock slot if slot was not found.
         * @param {String} name Name of the ad slot.
         * @return {Object} The ad slot or a mock ad slot.
         * @see slot-set.js
         */
        slot: slots.get,
        /**
         * ## harmony.hasSlot(name)
         * Check if a slot has already been loaded into Harmony.
         * @param {String} name Name of the ad slot.
         * @return {Boolean} True if the slot has already been loaded.
         * @see slot-set.js
         */
        hasSlot: slots.has,
        /**
         * ## harmony.group(name)
         * Fetch a slot group by name.
         * @param {String} name Name of the slot group.
         * @return {Array} Collection of 0 or more ad slots.
         * @see group-set.js
         */
        group: groups.get,
        /**
         * ## harmony.defineSlot(opts)
         * Create a new adSlot in the page.
         * @param {String} opts.name Slot name, ex) RP01
         * @param {String} opts.id Slot's div id, ex) ad-div-RP01
         * @param {Array} opts.sizes One or many 2D arrays, ex) [300, 250]
         * @param {String} opts.adunit Full ad unit code.
         * @param {Object} [opts.targeting] Slot-specific targeting.
         * @param {Array} [opts.mapping] Size mapping.
         * @param {Boolean} [opts.companion] True if companion ad.
         * @param {Boolean} [opts.drone] True when duplicates are anticipated.
         * @param {String} [opts.group] Slot group name.
         * @param {Boolean} [opts.interstitial] True if out-of-page ad.
         * @param {Boolean} [opts.enabled] False if ineligible to make ad calls.
         * @param {Object} [opts.on] Dictionary of callbacks.
         * @param {Object} [opts.one] Dictionary of single-run callbacks.
         * @return {AdSlot}
         * @see adslot.js
         */
        defineSlot: function (opts) {
            var slot;
            try {
                slot = AdSlot(
                    global.googletag.pubads(),
                    Util.scrubConf(opts)
                );
                slots.add(slot);
                groups.add(opts.group, slot);
            } catch (err) {
                log('error', {
                    msg: 'Slot failed to load during call to defineSlot()',
                    conf: opts,
                    err: err
                });
            }
            return slot;
        },
        /**
         * ## harmony.enable
         * ### harmony.enable.slot(name)
         * ### harmony.enable.group(name)
         * Marks slots as eligible to make ad calls.
         * @see actions/enable.js
         */
        enable: require('./actions/enable.js'),
        /**
         * ## harmony.disable
         * ### harmony.disable.slot(name)
         * ### harmony.disable.group(name)
         * Marks slots as ineligible to make ad calls.
         * @see actions/disable.js
         */
        disable: require('./actions/disable.js'),
        /**
         * ## harmony.refresh
         * ### harmony.refresh.slot(name)
         * ### harmony.refresh.group(name)
         * Refresh a single slot or group of slots.
         * @see actions/refresh.js
         */
        refresh: require('./actions/refresh.js'),
        /**
         * ## harmony.show
         * Showing a slot means setting style ```display:block``` and
         * calling ```googletag.display()```. Will not call
         * ```googletag.display()``` on disabled slots.
         */
        show: {
            /**
             * ### harmony.show.group(name)
             * Show all ads in a slot group.
             * @param {String} name
             */
            group: function (name) {
                var i, slot, el,
                    set = groups.get(name),
                    len = set.length;
                log('show', {
                    msg: 'Showing ads in group',
                    group: name
                });
                try {
                    for (i = 0; i < len; i += 1) {
                        slot = set[i];
                        slot.tsCalled = global.Date.now();

                        // Only make ad call if slot is enabled.
                        if (slot.enabled) {
                            slot.active = true;
                            global.googletag.display(slot.divId);
                        }

                        el = document.getElementById(slot.divId);
                        if (el) {
                            el.style.display = 'block';
                        } else {
                            log('error', {
                                msg: 'Failed to show slot for group',
                                group: name,
                                reason: 'Slot was missing from the DOM',
                                slot: slot
                            });
                        }
                    }
                } catch (err) {
                    log('error', {
                        msg: 'Failed to show group',
                        group: name,
                        err: err
                    });
                }
            },
            /**
             * ### harmony.show.slot(name)
             * Show a single ad slot.
             * @param {String} name
             */
            slot: function (name) {
                var slot, el;
                log('show', {
                    msg: 'Showing slot',
                    name: name
                });
                try {
                    slot = slots.get(name);
                    slot.tsCalled = global.Date.now();

                    // Only make ad call if slot is enabled.
                    if (slot.enabled) {
                        slot.active = true;
                        global.googletag.display(slot.divId);
                    }

                    el = document.getElementById(slot.divId);
                    el.style.display = 'block';
                } catch (err) {
                    log('error', {
                        msg: 'Failed to show slot',
                        name: name,
                        err: err
                    });
                }
            }
        },
        /**
         * ## harmony.hide
         * Hiding an ad means setting style ```display:none```.
         */
        hide: {
            /**
             * ### harmony.hide.group(name)
             * Hides all the ads in a slot group.
             * @param {String} name
             */
            group: function (name) {
                var i, el,
                    set = groups.get(name),
                    len = set.length;
                log('hide', 'Hiding ads in group ' + name);
                for (i = 0; i < len; i += 1) {
                    el = document.getElementById(set[i].divId);
                    if (el) {
                        el.style.display = 'none';
                    } else {
                        log('error', {
                            msg: 'Failed to hide slot in group',
                            group: name,
                            reason: 'Slot was missing from the DOM',
                            id: set[i].divId
                        });
                    }
                }
            },
            /**
             * ### harmony.hide.slot(name)
             * Hides a single ad slot.
             * @param {String} name
             */
            slot: function (name) {
                var el,
                    slot = slots.get(name);
                log('hide', {
                    msg: 'Hiding slot',
                    name: name
                });
                try {
                    el = document.getElementById(slot.divId);
                    el.style.display = 'none';
                } catch (err) {
                    log('error', {
                        msg: 'Failed to hide slot',
                        name: name,
                        err: err
                    });
                }
            }
        }
    }).extend(
        /**
         * ## harmony.on/one/off/trigger
         * Exposes event handling at the system level.
         * @see event-handler.js
         */
        Eventable()
    );
};
