import { LitElement } from "lit-element";

class PdbResidueInteractions extends LitElement {

  static get properties() {
    return {
      pdbId: { type: String, attribute: 'pdb-id' },
      chainId: { type: String, attribute: 'chain-id' }
    };
  }

  validateParams() {
    if(typeof this.pdbId == 'undefined') return false;
    return true
  }

  connectedCallback() {
    super.connectedCallback();

    let paramValidatity = this.validateParams();
    if(!paramValidatity) return

    // create an instance of the plugin
    this.viewInstance = new PdbResidueInteractionsPlugin();    
    this.viewInstance.render(this, this.pdbId, this.chainId);
  }

  createRenderRoot() {
    return this;
  }

}

export default PdbResidueInteractions;

customElements.define('pdb-residue-interactions', PdbResidueInteractions);