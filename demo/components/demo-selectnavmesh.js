customElements.define( 'demo-selectnavmesh', class extends HTMLElement {

    _meshes = [];

    get meshes() {
        return this._meshes;
    }

    set meshes( meshes ) {
        this._meshes = meshes;
        this.#render();
        this.shadowRoot.getElementById( 'dialog' ).showModal();
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' })
        this.#render();
    }

    _onClick = index => {
        this.dispatchEvent( new CustomEvent( 'navmesh', { detail: index } ) );
    }

    close() {
        this.shadowRoot.getElementById( 'dialog' ).close();
    }

    #render() {
        this.shadowRoot.innerHTML = `
        <style>
        button {
            width: 100%;
            display: block;
        }
        </style>
        <dialog id="dialog">
            <p>
                Please select the object<br>which should be used as a navmesh:
            </p>
            ${ this.meshes.map( ( mesh, index )=> `
                <button onclick="this.getRootNode().host._onClick(${ index })">${ mesh.name }</button>
            `).join( '' ) }
        </dialog>
        `;
    }
})