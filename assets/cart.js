class SideCartItem extends HTMLElement {
    constructor() {
        super();

        this.variant_id = this.getAttribute('variant-id');
        this.itemCount = Number(this.getAttribute('item-count'));
        this.itemKey = this.getAttribute('item-key');

        this.sideCart = this.closest('side-cart');
        this.attachEventListeners();
    }

    connectedCallback() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Remove any existing event listeners to prevent duplicates
        const deleteBtn = this.querySelector('.cart-item-delete');
        const decreaseBtn = this.querySelector('[data-action="decrease"]');
        const increaseBtn = this.querySelector('[data-action="increase"]');

        // Remove existing event listeners
        deleteBtn?.replaceWith(deleteBtn.cloneNode(true));
        decreaseBtn?.replaceWith(decreaseBtn.cloneNode(true));
        increaseBtn?.replaceWith(increaseBtn.cloneNode(true));
 
        // Add new event listeners
        this.querySelector('.cart-item-delete')?.addEventListener('click', this.clearLineItem.bind(this));
        this.querySelector('[data-action="decrease"]')?.addEventListener('click', this.minusQty.bind(this));
        this.querySelector('[data-action="increase"]')?.addEventListener('click', this.addQty.bind(this));
    }

    updateCart(updates) {
        this.sideCart?.classList.remove('loaded');
        
        fetch(window.Shopify.routes.root + 'cart/update.js', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ updates })
        })
        .then(response => response.json())
        .then(cart => {
            this.sideCart.cart = cart;
            this.sideCart.buildCart(cart);
        })
        .catch(error => {
            console.error('Error updating cart:', error);
            this.sideCart?.classList.add('loaded');
        });
    }

    addQty(e) {
        e?.preventDefault();
        const updates = {};
        updates[this.variant_id] = (this.itemCount || 0) + 1;
        this.updateCart(updates);
    }

    minusQty(e) {
        e?.preventDefault();
        const updates = {};
        updates[this.variant_id] = Math.max(0, (this.itemCount || 1) - 1);
        this.updateCart(updates);
    }

    clearLineItem(e) {
        e?.preventDefault();
        const updates = {};
        updates[this.variant_id] = 0;
        this.updateCart(updates);
    }
}

customElements.define('side-cart-item', SideCartItem);

class SideCart extends HTMLElement {
    constructor() {
        super();
        this.drawer = this.closest('sidebar-drawer');
        this.itemTemplate = this.querySelector('template#side-cart-item');
        this.cart = null;
        
        // Initialize with a small delay to ensure DOM is ready
        setTimeout(() => this.initializeCart(), 100);
    }

    initializeCart() {
        this.getCart();
        
        // Close cart when clicking outside
        const backdrop = this.drawer?.querySelector('.sidebar-drawer-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                this.drawer?.close?.();
            });
        }
    }

    renderSideCartItem(context = {}) {
        if (!this.itemTemplate) return null;
        
        const template = this.itemTemplate;
        const clone = template.content.cloneNode(true);
        const element = clone.querySelector('side-cart-item');
        const item = context.item;
        
        if (!element) return null;

        // Set attributes
        element.setAttribute('variant-id', item.variant_id || item.id);
        element.setAttribute('item-count', item.quantity);
        element.setAttribute('item-key', item.key);
        
        // Update inner HTML with item data
        const imageUrl = item.image?.src || 
                        (item.featured_image?.url ? item.featured_image.url + '&width=100' : 
                        'https://via.placeholder.com/150');
        
        const price = item.final_line_price || (item.price * item.quantity);
        
        // Create a temporary container to safely manipulate HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = element.innerHTML
            .replace(/\$\$IMAGE_URL\$\$/g, imageUrl)
            .replace(/\$\$ITEM_TITLE\$\$/g, item.product_title || '')
            .replace(/\$\$ITEM_PRICE\$\$/g, price ? window.Shopify?.formatMoney?.(price) || price : '0')
            .replace(/\$\$ITEM_QUANTITY\$\$/g, item.quantity || 0)
            .replace(/\$\$ITEM_VARIANT_TITLE\$\$/g, item.variant_title || '');
        
        // Clear and append new content
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        while (tempDiv.firstChild) {
            element.appendChild(tempDiv.firstChild);
        }
        
        return clone;
    }

    getCart() {
        fetch(window.Shopify.routes.root + 'cart.js')
            .then(response => response.json())
            .then(cart => { 
                this.cart = cart;
                this.buildCart(cart);
            })
            .catch(error => {
                console.error('Error fetching cart:', error);
            });
    }

    addLineItem(newItem) {
        // Check if item already exists in cart
        const existingItem = this.cart.items.find(item => item.id === newItem.id);
        
        if (existingItem) {
            // Update quantity if item exists
            existingItem.quantity += newItem.quantity;
            existingItem.line_price = existingItem.quantity * (newItem.price / 100);
        } else {
            // Add new item to cart
            this.cart.items.push({
                ...newItem,
                key: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                line_price: newItem.price * newItem.quantity / 100
            });
        }

        // Update cart totals
        this.cart.item_count = this.cart.items.reduce((total, item) => total + item.quantity, 0);
        this.cart.total_price = this.cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        
        // Rebuild the cart UI
        this.buildCart(this.cart);
        
        // Show success message
        this.showNotification('Item added to cart!');
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.textContent = message;
        this.appendChild(notification);
        
        setTimeout(() => {
            if (this.contains(notification)) {
                this.removeChild(notification);
            }
        }, 2000);
    }

    buildCart(cart) {
        const cartItemsContainer = this.querySelector('#cart-items');
        const cartTotalContainer = this.querySelector('#cart-total');
        const cartFooter = this.querySelector('.cart-footer');
        
        if (!cartItemsContainer) {
            console.error('Cart items container not found');
            return;
        }

        // Clear existing items
        cartItemsContainer.innerHTML = '';

        if (cart.items && cart.items.length > 0) {
            cart.items.forEach(item => {
                const fragment = this.renderSideCartItem({ item });
                if (fragment) {
                    cartItemsContainer.appendChild(fragment);
                }
            });
            
            if (cartFooter) cartFooter.style.display = 'block';
        } else {
            cartItemsContainer.innerHTML = '<p class="empty-cart-message">Your cart is empty</p>';
            if (cartFooter) cartFooter.style.display = 'none';
        }
        
        // Update cart total
        if (cartTotalContainer) {
            cartTotalContainer.innerHTML = `
                <span>Total:</span>
                <span>${window.Shopify?.formatMoney?.(cart.total_price) || cart.total_price}</span>
            `;
        }
        
        this.classList.add('loaded');
    }
}

customElements.define('side-cart', SideCart);

// Initialize cart functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Open cart when clicking cart icon
    document.addEventListener('click', (e) => {
        const cartToggle = e.target.closest('[data-cart-toggle]');
        if (cartToggle) {
            e.preventDefault();
            document.querySelector('sidebar-drawer')?.open?.();
        }
    });
});