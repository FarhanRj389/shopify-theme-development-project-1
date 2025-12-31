class SideCartItem extends HTMLElement {
    constructor() {
        super();

        this.variant_id = this.getAttribute('variant-id');
        this.itemCount = Number(this.getAttribute('item-count'));

        this.sideCart = this.closest('side-cart');

        this.querySelector('.cart-item-delete').addEventListener('click', this.clearLineItem.bind(this));
        this.querySelector('.cart-item-qty-plus').addEventListener('click', this.addQty.bind(this));
        this.querySelector('.cart-item-qty-minus').addEventListener('click', this.minusQty.bind(this));
    }

    updateCart(updates) {
        fetch(window.Shopify.routes.root + 'cart/update.js', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({updates})})
        .then(response => response.json())
        .then(cart => { 
            this.sideCart.cart = cart;
            this.sideCart.buildCart(cart);
        });
    }

    addQty() {
        let updates = {};
        updates[this.variant_id] = this.itemCount + 1;
        this.sideCart.classList.remove('loaded');
        this.updateCart(updates);
    }

    minusQty() {
        let updates = {};
        updates[this.variant_id] = this.itemCount - 1;
        this.sideCart.classList.remove('loaded');
        this.updateCart(updates);
    }

    clearLineItem() {
        let updates = {};
        updates[this.variant_id] = 0;
        this.sideCart.classList.remove('loaded');
        this.updateCart(updates);
    }
}

customElements.define('side-cart-item', SideCartItem);

class SideCart extends HTMLElement {
    constructor() {
        super();

        this.drawer = this.closest('side-bar-drawer');
        console.log(this.drawer);
        
        this.itemTemplate = this.querySelector('template#side-cart-item') // <- Put your template code for your side cart item here
    }

    renderSideCartItem(context = {}) {
        const template = this.itemTemplate
      
        // Clone the template content
        const clone = template.content.cloneNode(true);
      
        // Find the <side-cart-item> element within the cloned template
        const element = clone.querySelector('side-cart-item');
      
        // Set attributes dynamically based on context.item
        const item = context.item;
        element.setAttribute('variant-id', item.id);
        element.setAttribute('item-count', item.quantity);
      
        // You can also update inner text or other DOM parts here if needed
        element.innerHTML = element.innerHTML
            .replace(/\$\$IMAGE_URL\$\$/g, item.featured_image.url ? item.featured_image.url + '&width=100' : 'https://via.placeholder.com/150')
            .replace(/\$\$IMAGE_ALT\$\$/g, item.featured_image.alt)
            .replace(/\$\$ITEM_TITLE\$\$/g, item.product_title)
            .replace(/\$\$ITEM_PRICE\$\$/g, Shopify.formatMoney(item.final_line_price))
            .replace(/\$\$ITEM_QUANTITY\$\$/g, item.quantity)
            .replace(/\$\$ITEM_VARIANT_TITLE\$\$/g, item.variant_title ? item.variant_title : '')
      
        return clone;
    }

    getCart() {
        fetch(window.Shopify.routes.root + 'cart.js')
        .then(response => response.json())
        .then(cart => { 
            console.log(cart);
            this.cart = cart;
            this.buildCart(cart);
        });
    }

    buildCart(cart) {
        this.querySelector('#cart-items').innerHTML = ''; // Reset InnerHTML of the div

        if(cart.items.length === 0) {
            this.querySelector('#cart-items').innerHTML = `<p>No items in your cart.</p>`;
        } else {
            cart.items.forEach(item => {
                const fragment = this.renderSideCartItem({ item });
                this.querySelector('#cart-items').appendChild(fragment);
            });
        }
            

        this.querySelector('#cart-total').innerHTML = `
            <div></div>
            <div>Total:</div>
            <div>${Shopify.formatMoney(cart.total_price)}</div>
        `;
        this.classList.add('loaded');
        this.drawer.open();
    }

    addLineItem(line_item) {
        if(this.cart) {
            line_item.final_line_price = line_item.final_price * line_item.quantity;
            const existingLineItem = this.cart.items.find(item => item.id == line_item.id);

            if(existingLineItem) {
                existingLineItem.quantity = line_item.quantity;
                existingLineItem.final_line_price = line_item.final_line_price;
            } else {
                this.cart.items.push(line_item);
            }
    
            const accumulate = (items, prop) => {
                return items.reduce( function(a, b){
                    return a + b[prop];
                }, 0);
            }
        
            this.cart.total_price = accumulate(this.cart.items, 'final_line_price');
            
            this.buildCart(this.cart);
        } else {
            this.getCart();
        }
    }
    
}

customElements.define('side-cart', SideCart);