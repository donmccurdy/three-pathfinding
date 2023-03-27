customElements.define( 'demo-file', class extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' })
        this.#render();
    }

    enter() {
        this.setAttribute( 'enter', '' );
    }

    leave() {
        this.removeAttribute( 'enter' );
    }

    uploaded() {
        this.setAttribute( 'uploaded', '' );
    }

    onFile( event ) {
        this.dispatchEvent( new CustomEvent( 'file', { detail: event.target.files[0] }))
    }

    #render() {
        this.shadowRoot.innerHTML = `
        <style>
            .file-upload {
                display: flex;
                flex-direction: column;
                align-items: center;
                border: 2px dashed rgba(0, 0, 0, .8);
                padding: 48px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                position: fixed;
                color: black;
                transition-property: border-color, color, fill;
                transition-duration: 200ms;
                transition-timing-function: ease;
            }
            :host([enter]) .file-upload {
                fill: var( --swatch-start );
                border-color: var( --swatch-start );
                color: var( --swatch-start );
            }
            :host([uploaded]) .file-upload {
                display: none;
            }
            .file-upload svg {
                width: 48px;
                height: 48px;
                display: block;
            }
            #load-file {
                display: none;
            }
        </style>
        <label class="file-upload" for="load-file">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 12H4V17H20V12H22V17C22 18.11 21.11 19 20 19H4C2.9 19 2 18.11 2 17V12M12 2L6.46 7.46L7.88 8.88L11 5.75V15H13V5.75L16.13 8.88L17.55 7.45L12 2Z" /></svg>
            <p>
                <strong>Drag and drop gltf/glb files</strong> or choose a file
            </p>
            <input
                type="file"
                id="load-file"
                onchange="this.getRootNode().host.onFile(event)"
            />
        </label>
        `;
    }
})