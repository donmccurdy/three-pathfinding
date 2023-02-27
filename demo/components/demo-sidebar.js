customElements.define( 'demo-sidebar', class extends HTMLElement {

    demos = [ {
        title: 'Drag and Drop',
        pathname: '/',
    }, {
        title: 'Teleport',
        pathname: '/teleport.html',
    } ]

    constructor() {
        super();
        this.attachShadow({ mode: 'open' })
        this.#render();

    }

    _media = null;
    #mediaQuery = '(min-width: 600px)';
    _onViewport = () => {

        // Always reset open state on media breakpoint
        this.removeAttribute( 'open' );
    }

    connectedCallback() {
        this._media = window.matchMedia( this.#mediaQuery )
        this._media.addListener( this._onViewport );
        this._onViewport();
    }
    disconnectedCallback() {
        if( _media ) this._media.removeListener( this._onViewport );
    }

    #openIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" /></svg>`;
    }

    #closeIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>`;
    }

    onOpen = () => {
        this.setAttribute( 'open', '' );
    }

    onClose = () => {
        this.removeAttribute( 'open' );
    }

    #render() {

        this.shadowRoot.innerHTML = `
        <style>
        :host {
            color: white;
        }
        #open-button, #close-button {
            all: unset;
            position: fixed;
            padding: 8px;
            background-color: var( --swatch-background );
            top: 16px;
            right: 16px;
        }
        :is(#open-button, #close-button):is(:active,:focus){
            background-color: var( --swatch-start );
        }
        @media ${ this.#mediaQuery } {
            #open-button, #close-button {
                display: none;
            }
        }
        :host(:not([open])) #close-button {
            display: none;
        }
        :host([open]) #open-button {
            display: none;
        }
        nav {
            overflow-y: auto;
            overflow-x: hidden;
            transform: translateX( -100% );
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            padding: 1em;
            height: 100vh;
            position: fixed;
            background-color: var( --swatch-background );
            font-size: 14px;
            width: 100%;
            transition: transform 200ms ease;
        }
        :host([open]) nav {
            transform: none;
        }
        @media ${ this.#mediaQuery } {
            nav {
                max-width: 256px;
                transform: none;
            }
        }
        h1 {
            font-size: 1.5em;
            margin-top: 0;
            margin-bottom: 0.5em;
        }
        svg {
            display: block;
            fill: white;
            width: 24px;
            height: 24px;
        }

        p {
            padding: 0;
            margin: 1em 0;
            line-height: 1.4em;
        }

        a,
        a:visited {
            color: #FFFFFF;
        }

        .swatches {
            line-height: 1.4em;
        }

        .swatch {
            display: inline-block;
            width: 1em;
            height: 1em;
            vertical-align: top;
            margin: 0.1em;
            border-radius: 2px;
        }
        </style>
        <nav>
            <div>
                <h1>three-pathfinding</h1>
                <a href="https://github.com/donmccurdy/three-pathfinding">Source</a> •
                <a href="https://github.com/donmccurdy/three-pathfinding#api">Documentation</a>
                <p>
                    Click anywhere on the level to calculate a path. 
                </p>
                <ul class="swatches">
                    <li>
                        <i class="swatch" style="background-color: var( --swatch-start );"></i> start/player
                    </li>
                    <li>
                        <i class="swatch" style="background-color: var( --swatch-target );"></i> target
                    </li>
                    <li>
                        <i class="swatch" style="background-color: var( --swatch-waypoint );"></i> waypoint
                    </li>
                    <li>
                        <i class="swatch" style="background-color: var( --swatch-clamped-step );"></i> clamped step
                    </li>
                    <li>
                        <i class="swatch" style="background-color: var( --swatch-closest-node );"></i> closest node
                    </li>
                </ul>
                <h3>In this demo</h3>
                <slot></slot>
            </div>
            <section>
                <h3>Demos</h3>
                <ul>
                    ${ this.demos
                        .map( demo => `<li><a href="${ demo.pathname }">${ demo.title }</a></li>`)
                        .join('')
                    }
                </ul>
            </section>
        </nav>
        <button
            type="button"
            id="open-button"
            onclick="this.getRootNode().host.onOpen()"
        >${ this.#openIcon() }</button>
        <button
            type="button"
            id="close-button"
            onclick="this.getRootNode().host.onClose()"
        >${ this.#closeIcon() }</button>
        `;
    }
})