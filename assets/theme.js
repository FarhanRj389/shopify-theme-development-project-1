class SidebarDrawer extends HTMLElement {
  constructor() {
    super();
    this.Wrapper = document.createElement("div");
    this.Wrapper.className = "sidebar-drawer-wrapper";
    this.backdrop = document.createElement("div");
    this.backdrop.className = "sidebar-drawer-backdrop";
    this.drawer = document.createElement("div");
    this.drawer.className = "sidebar-drawer";

    document
      .getElementById("header-cart-icon")
      .addEventListener("click", (evt) => {
        evt.preventDefault();
        if (!this.isOpen()) {
          this.open();
        } else {
          this.close();
        }
      });
  }

  connectedCallback() {
    while (this.childNodes.length) {
      this.drawer.appendChild(this.childNodes[0]);
    }
    this.Wrapper.appendChild(this.backdrop);
    this.Wrapper.appendChild(this.drawer);
    this.appendChild(this.Wrapper);

    this.backdrop.addEventListener("click", () => this.close());

    document.addEventListener(
      "keydown",
      (this._escHandler = (e) => {
        if (this.isOpen() && e.key === "Escape") this.close();
      })
    );

    this.drawer.querySelectorAll("#close-sidebar-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.close());
    });
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._escHandler);
  }

  open() {
    this.Wrapper.classList.add("open");
  }

  close() {
    this.Wrapper.classList.remove("open");
  }
  isOpen() {
    return this.Wrapper.classList.contains("open");
  }
}
customElements.define("sidebar-drawer", SidebarDrawer);

