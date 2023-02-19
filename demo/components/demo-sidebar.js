customElements.define( 'demo-sidebar', class extends HTMLElement {

    demos = [ {
        title: 'Teleport',
        pathname: '/',
    }, {
        title: 'Drag and Drop',
        pathname: '/drag-and-drop.html',
    } ]

    constructor() {
        super();
        this.attachShadow({ mode: 'open' })
        this.#render();
    }

    #render() {

        this.shadowRoot.innerHTML = `
        <style>
        :host {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            padding: 1em;
            height: 100vh;
            max-width: 256px;
            position: fixed;
            background-color: rgba(0, 0, 0, 0.8);
            font-size: 14px;
        }
        h1 {
            font-size: 1.5em;
            margin-bottom: 0.5em;
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
        <div>
            <h1>three-pathfinding</h1>
            <a href="https://github.com/donmccurdy/three-pathfinding">Source</a> •
            <a href="https://github.com/donmccurdy/three-pathfinding#api">Documentation</a>
            <p>
                Click anywhere on the level to calculate a path. 
            </p>
            <ul class="swatches">
                <li>
                    <i class="swatch" style="background: #EE836F;"></i> start/player
                </li>
                <li>
                    <i class="swatch" style="background: #DCCB18;"></i> target
                </li>
                <li>
                    <i class="swatch" style="background: #00A3AF;"></i> waypoint
                </li>
                <li>
                    <i class="swatch" style="background: #DCD3B2;"></i> clamped step
                </li>
                <li>
                    <i class="swatch" style="background: #43676B;"></i> closest node
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
        `;
    }
})