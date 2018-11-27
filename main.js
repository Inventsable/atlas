window.Event = new Vue();

Vue.component('atlas', {
    template: `
        <div class="atlas-main" @mouseover="wakeApp" @mouseout="sleepApp">
            <div class="title">
                <div class="device-name">{{total}}</div>
                <div class="browser">{{browser}}</div>
                <div class="window-stats">{{windowStats}}</div>
            </div>
            <mod-keys></mod-keys>
            <div id="grid" class="grid">
                <div class="gesture">{{lastGesture}}</div>
            </div>
            <revisions></revisions>
        </div>
    `,
    data() {
        return {
            msg: 'Hello atlas',
        }
    },
    mounted() {
        console.log(this.msg);
    },
    computed: {
        total: function() {

            if (this.device == 'Phone') {
                return `Phone (Portrait)`
            } else if (this.browser == 'Android') {
                return `Phone (Landscape)`
            } else {
                return this.device;
            }
        },
        device: function() {
            var target = '';
            if (this.$root.windowWidth <= 768) {
                target = 'Phone'
            } else if (this.$root.windowWidth <= 992) {
                target = 'Tablet'
            } else if (this.$root.windowWidth <= 1200) {
                target = 'Medium'
            } else if (this.$root.windowWidth <= 2100) {
                target = 'Desktop'
            } else {
                target = 'HD Desktop'
            }
            return target;
        },
        browser: function() {
            var target = '';
            if (!!window.chrome && !!window.chrome.webstore)
                target = 'Chrome'
            else if (!!window.chrome)
                target = 'Android'
            else if ('WebkitAppearance' in document.documentElement.style)
                target = 'Webkit'
            else if ('MozAppearance' in document.documentElement.style)
                target = 'Mozilla'
            else if (document.all && !window.atob)
                target = 'IE < 10'
            else if (window.navigator.msPointerEnabled)
                target = 'IE > 10'
            else 
                target = 'Unknown'
            this.$root.browser = target;
            return target;
        },
        windowStats: function() {
            return `w: ${this.$root.windowWidth}, h: ${this.$root.windowHeight}`;
        },
        lastGesture: function() {
            return this.$root.gesture;
        }
    },
    methods: {
        sleepApp() {
            this.$root.isWake = false;
        },
        wakeApp() {
            this.$root.isWake = true;
        }
    }
})

Vue.component('revisions', {
    template: `
        <div class="revision-grid">
            <div v-for="type in eventList" class="revisions">
                <div class="revision-title">{{type.name}}</div>
                <div 
                    :contenteditable="checkIfMobile"
                    spellcheck="false"
                    class="revision-input">
                    {{type.msg}}
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            eventList: [
                {
                    name: 'Click',
                    count: 0,
                    // suffix: '',
                    msg: '0',
                    // caller: 'writeClickRevision',
                },
                {
                    name: 'Click/Drag',
                    count: 0,
                    msg: '0',
                },
                {
                    name: 'Touch',
                    count: 0,
                    msg: '0',
                },
                {
                    name: 'Touch/Drag',
                    count: 0,
                    msg: '0',
                },
                {
                    name: 'Scroll',
                    count: 0,
                    msg: '0',
                },
                {
                    name: 'Wheel',
                    count: 0,
                    msg: '0',
                },
                {
                    name: 'Key',
                    count: 0,
                    msg: '',
                },
            ],
            hide: false,
            message: '',
            xRes: 0,
            yRes: 0,
            recentEvt: '',
        }
    },
    mounted() {
        Event.$on('writeRevision', this.writeRevision);
    },
    methods: {
        checkIfMobile() {
            if (this.$root.browser !== 'Android') {
                return true;
            } else {
                return false;
            }
        },
        findEvent(name) {
            for (var i = 0; i < this.eventList.length; i++) {
                var child = this.eventList[i];
                if (child.name == name) {
                    return child;
                }
            }
        },
        writeRevision(name) {
            var mirror;
            if (/Key/.test(name)) {
                name = name.split(':')
                mirror = this.findEvent(name[0]);
                mirror.msg = `${name[1]}`
            } else if (/Wheel|Scroll/.test(name)) {
                name = name.split(':')
                mirror = this.findEvent(name[0]);
                mirror.count = mirror.count + Number(name[1]);
                mirror.msg = mirror.count;
            } else {
                mirror = this.findEvent(name);
                mirror.count = mirror.count + 1;
                mirror.msg = `${mirror.count}`
            }
        },
    },
})

Vue.component('mod-keys', {
    template: `
        <div 
            v-mousemove-outside="onMouseMove"
            v-keydown-outside="onKeyDown"
            v-keyup-outside="onKeyUp"
            v-mouseup-outside="onMouseUp"
            v-mousedown-outside="onMouseDown"
            v-click-outside="onClickOutside"
            v-event-outside="{ name: 'touchstart', handler: onTouchStart }"
            class="visualizerModKeys" 
            :style="'grid-template-columns: repeat(' + this.activeList.length + ', 1fr);'">
            <div v-for="modKey in activeList" :class="getModKeyClass(modKey)"></div>
            <div class="dummy" v-event-outside="{ name: 'touchend', handler: onTouchEnd }"></div>
            <div class="dummy" v-event-outside="{ name: 'touchmove', handler: onTouchMove }"></div>
            <div class="dummy" v-event-outside="{ name: 'touchcancel', handler: onTouchCancel }"></div>
        </div>
  `,
    data() {
        return {
            cursor: 'default',
            activeList: [
                { name: 'Ctrl' },
                { name: 'Shift' },
                { name: 'Alt' },
            ],
            elt: null,
            clicked: 0,
            touched: 0,
            Shift: false,
            Ctrl: false,
            Alt: false,
            mouseX: 0,
            mouseY: 0,
            lastMouseX: 0,
            lastMouseY: 0,
            wasDragging: false,
        }
    },
    mounted() {
        var self = this;
        this.activeMods();
        // this.setCursor('pointer')
        Event.$on('updateModsUI', self.updateMods);
        Event.$on('clearMods', self.clearMods);
    },
    methods: {
        setCursor(cursorStyle) {
            // @@ This works but is too delayed. Should programmatically access cursor style
            // var elt = document.getElementById('grid');
            // if (elt.style) {
            //     elt.style.cursor = cursorStyle;
            // }
        },
        activeMods() {
            var mirror = [], child = {};
            if (this.Ctrl) {
                child = { name: 'Ctrl', key: 0 }
                mirror.push(child);
            }
            if (this.Shift) {
                child = { name: 'Shift', key: 1 }
                mirror.push(child);
            }
            if (this.Alt) {
                child = { name: 'Alt', key: 2 }
                mirror.push(child);
            }
            this.activeList = mirror;
        },
        clearMods() {
            this.Shift = false;
            this.Alt = false;
            this.Ctrl = false;
            this.activeList = [];
        },
        updateMods() {
            this.Ctrl = this.$root.Ctrl;
            this.Shift = this.$root.Shift;
            this.Alt = this.$root.Alt;
            this.activeMods();
        },
        getModKeyClass(type) {
            return 'modKey-' + type.name + '-Active'
        },
        onMouseMove(e, el) {
            // this.elt = el;
            this.mouseX = e.clientX, this.mouseY = e.clientY;
            if (this.$root.isDragging) {
                this.setCursor('move');
                this.$root.gesture = `Dragging: [${this.mouseX}, ${this.mouseY}]`
            }
            this.$root.parseModifiers(e);
        },
        onClickOutside(e, el) {
            if (!this.wasDragging) {
                Event.$emit('writeRevision', 'Click');
                this.$root.gesture = `Clicked: [${this.mouseX}, ${this.mouseY}]`
            }
        },
        onTouchStart(e, el) {
            Event.$emit('writeRevision', 'Touch');
            this.$root.gesture = `Touch Start: [${this.mouseX}, ${this.mouseY}]`
        },
        onTouchEnd(e, el) {
            Event.$emit('writeRevision', 'Touch');
            this.$root.gesture = `Touch End: [${this.mouseX}, ${this.mouseY}]`
        },
        onTouchMove(e, el) {
            Event.$emit('writeRevision', 'Touch');
            this.$root.gesture = `Touch Move: [${this.mouseX}, ${this.mouseY}]`
        },
        onTouchCancel(e, el) {
            Event.$emit('writeRevision', 'Touch');
            this.$root.gesture = 'Touch Cancel'
        },
        onMouseUp(e, el) {
            if (this.$root.isDragging) {
                if (((this.lastMouseX <= this.mouseX + 6) && (this.lastMouseX >= this.mouseX - 6)) && ((this.lastMouseY <= this.mouseY + 6) && (this.lastMouseY >= this.mouseY - 6))) {
                    this.wasDragging = false;
                } else {
                    Event.$emit('writeRevision', 'Click/Drag');
                    this.wasDragging = true;
                    this.$root.gesture = `Dragged from [${this.lastMouseX}, ${this.lastMouseY}] to [${this.mouseX}, ${this.mouseY}]`
                }
                this.$root.isDragging = false;
            } else {
                console.log('No longer dragging')
            }
            this.setCursor('default');
        },
        onMouseDown(e, el) {
            // this.$root.gesture = `Clicked [${this.mouseX}, ${this.mouseY}]`
            this.setCursor('move');
            this.$root.isDragging = true, this.wasDragging = false;
            this.lastMouseX = this.mouseX, this.lastMouseY = this.mouseY;
        },
        onKeyDown(e, el) {
            // console.log(e)
            this.$root.gesture = `Key: [${e.key}]`
            Event.$emit('writeRevision', 'Key:' + e.key)
            this.$root.parseModifiers(e);
        },
        onKeyUp(e, el) {
            Event.$emit('writeRevision', 'Key:' + e.key)
            this.$root.parseModifiers(e);
        },
    },
    computed: {
        isDefault: function () { return this.$root.isDefault },
    },
})

var app = new Vue({
    el: '#app',
    data: {
        msg: 'Hello world',
        isWake: false,
        isDragging: false,
        wasDragging: false,
        isTouching: false,
        showCrosshair: false,
        gesture: '',
        active: {
            browser: '',
            state: false,
            selection: [],
            lastSelection: [],
            index: 6,
            board: 'Terrenus',
            region: '',
            area: '',
            water: '',
            label: '',
            marker: '',
        },
        spirit: 'city',
        Shift: false,
        Ctrl: false,
        Alt: false,
        macOS: false,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
    },
    mounted() {
        if (navigator.platform.indexOf('Win') > -1) { this.macOS = false; } else if (navigator.platform.indexOf('Mac') > -1) { this.macOS = true; }
        console.log(this.msg)
        document.addEventListener('wheel', this.handleWheel);
        document.addEventListener('scroll', this.handleScroll);
        this.handleResize(null);
        window.addEventListener('resize', this.handleResize);
    },
    methods: {
        handleResize(evt) {
            this.windowWidth = document.documentElement.clientWidth;
            this.windowHeight = document.documentElement.clientHeight;
        },
        handleScroll(evt) {
            Event.$emit('writeRevision', 'Scroll:' + (evt.deltaY < 0 ? 1 : -1));
            this.gesture = 'Scrolling'
        },
        handleWheel(evt) {
            console.log('Handling wheel');
            if (evt.deltaY < 0) {
                this.gesture = 'Wheel Up'
            } else {
                this.gesture = 'Wheel Down'
            }
            Event.$emit('writeRevision', 'Wheel:' + (evt.deltaY < 0 ? 1 : -1));
        },
        wake() {
            this.isWake = true;
        },
        sleep() {
            this.isWake = false;
        },
        getCSS(prop) {
            return window.getComputedStyle(document.documentElement).getPropertyValue('--' + prop);
        },
        setCSS(prop, data) {
            document.documentElement.style.setProperty('--' + prop, data);
        },
        percentage(total, num) {
            return (total / num);
        },
        clearCrosshair() {
            this.showCrosshair = false;
        },
        parseModifiers(evt) {
            // if (this.selection !== this.lastSelection)
            //     this.lastSelection = this.selection;
            // console.log(evt)
            var lastMods = [this.Ctrl, this.Shift, this.Alt]
            if (this.isWake) {
                if (((!this.macOS) && (evt.ctrlKey)) || ((this.macOS) && (evt.metaKey))) {
                    this.Ctrl = true;
                } else {
                    this.Ctrl = false;
                }
                if (evt.shiftKey)
                    this.Shift = true;
                else
                    this.Shift = false;
                if (evt.altKey) {
                    evt.preventDefault();
                    this.Alt = true;
                } else {
                    this.Alt = false;
                };
                var thisMods = [this.Ctrl, this.Shift, this.Alt]
                if (!this.isEqualArray(lastMods, thisMods)) {
                    // change
                    // console.log(`${thisMods} : ${lastMods}`)
                }
                Event.$emit('updateModsUI');
            } else {
                Event.$emit('clearMods');
            }
        },
        flushModifiers() {
            this.Ctrl = false;
            this.Shift = false;
            this.Alt = false;
            Event.$emit('clearMods');
        },
        isEqualArray(array1, array2) {
            array1 = array1.join().split(','), array2 = array2.join().split(',');
            var errors = 0, result;
            for (var i = 0; i < array1.length; i++) {
                if (array1[i] !== array2[i])
                    errors++;
            }
            if (errors > 0)
                result = false;
            else
                result = true;
            return result;
        },
    }
})