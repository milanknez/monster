import { Boost } from '../types';

// Typy pro cordova-plugin-purchase (v13+)
declare const CdvPurchase: any;

export interface PurchaseHandler {
  onSuccess: (boost: Boost | string) => void;
  onError: (error: string) => void;
}

class PurchaseService {
  private isInitialized = false;
  private isReady = false;
  private handler: PurchaseHandler | null = null;
  private recoveryHandler: PurchaseHandler | null = null;
  private products: any[] = [];
  private readyCallbacks: Array<() => void> = [];
  private pendingRewards: Array<Boost | string> = [];
  private lastPurchasedId: string | null = null;

  private getStore() {
    if (typeof CdvPurchase !== 'undefined' && CdvPurchase.store) {
      return CdvPurchase.store;
    }
    return null;
  }

  init() {
    const store = this.getStore();
    if (!store) {
      console.warn('IAP Store is not available (not running on device?)');
      return;
    }

    if (this.isInitialized) return;
    this.isInitialized = true;

    // Safe access to constants
    const ProductType = CdvPurchase.ProductType || {};
    const Platform = CdvPurchase.Platform || {};
    
    // Zkusíme vytáhnout oficiální stringy z pluginu
    const googlePlay = Platform.GOOGLE_PLAY || 'android-playstore';
    const consumable = ProductType.CONSUMABLE || 'consumable';
    const nonConsumable = ProductType.NON_CONSUMABLE || 'non consumable';

    console.log('IAP INTERNAL CONSTANTS:', { 
      orig_platform: Platform.GOOGLE_PLAY,
      used_platform: googlePlay 
    });

    // Registrace produktů
    try {
      store.register([
        { id: 'xp_1day',      type: consumable,    platform: googlePlay },
        { id: 'xp15x',        type: consumable,    platform: googlePlay },
        { id: 'hp50',         type: consumable,    platform: googlePlay },
        { id: 'hp100',        type: consumable,    platform: googlePlay },
        { id: 'inv20',        type: nonConsumable, platform: googlePlay },
        { id: 'inv24',        type: nonConsumable, platform: googlePlay },
      ]);
      console.log('Register call executed successfully.');
    } catch (e) {
      console.error('Register call FAILED:', e);
    }

    // Globální handlers
    store.when().approved((transaction: any) => {
      console.log('IAP [Approved]:', transaction.id, 'for', transaction.products?.map((p: any) => p.id).join(', '));
      transaction.verify();
    });

    store.when().verified((receipt: any) => {
      console.log('IAP [Verified]:', receipt.id || 'no-id');
      
      // Extract products from the verified object
      let productIds: string[] = [];
      
      const extractIds = (items: any[]) => {
         if (!Array.isArray(items)) return;
         items.forEach((p: any) => {
             if (p.id && typeof p.id === 'string' && !p.id.startsWith('GPA.')) {
                 productIds.push(p.id);
             }
         });
      };

      if (receipt.products) extractIds(receipt.products);
      if (receipt.transactions) {
         receipt.transactions.forEach((tx: any) => {
             if (tx.products) extractIds(tx.products);
         });
      }
      if (receipt.productId) {
         productIds.push(receipt.productId);
      } else if (receipt.id && !receipt.id.startsWith('ord.') && !receipt.id.startsWith('GPA.')) {
         productIds.push(receipt.id);
      }
      
      if (productIds.length === 0 && this.lastPurchasedId) {
         console.warn('IAP Using fallback lastPurchasedId:', this.lastPurchasedId);
         productIds.push(this.lastPurchasedId);
      }

      // Odebrání duplicit
      productIds = Array.from(new Set(productIds));

      console.log('IAP Identified products to fulfill:', productIds);

      if (productIds.length > 0) {
        productIds.forEach(id => this.processPurchase(id));
        if (typeof receipt.finish === 'function') {
          receipt.finish();
        }
      } else {
        console.warn('IAP Could not identify product ID from verified object:', JSON.stringify(receipt));
        if (this.handler) this.handler.onError('Platba selhala: nelze určit zakoupenou položku.');
      }
    });

    store.when().finished((transaction: any) => {
      console.log('IAP [Finished]:', transaction.id);
    });

    store.error((err: any) => {
      console.error('IAP Store Error:', err.code, err.message);
      if (this.handler) {
        this.handler.onError(err.message || `Chyba obchodu (${err.code})`);
      }
    });

    // Čekáme na ready event
    store.ready(() => {
      this.isReady = true;
      this.products = store.products || [];
      console.log(`IAP Store is READY. Products: ${this.products.length}`);
      
      // Spustíme čekající nákupy
      this.readyCallbacks.forEach(cb => cb());
      this.readyCallbacks = [];
    });

    // Initialize with the identified platform
    store.initialize([googlePlay])
      .then(() => console.log('IAP Initialize requested.'))
      .catch((err: any) => {
        console.error('IAP Initialize Exception:', err);
      });
  }

  setHandler(handler: PurchaseHandler | null) {
    this.handler = handler;
    if (handler) this.flushPendingRewards(handler);
  }

  setRecoveryHandler(handler: PurchaseHandler | null) {
    this.recoveryHandler = handler;
    if (handler) this.flushPendingRewards(handler);
  }

  private flushPendingRewards(target: PurchaseHandler) {
    if (this.pendingRewards.length > 0) {
      console.log(`IAP Flushing ${this.pendingRewards.length} pending rewards...`);
      const rewards = [...this.pendingRewards];
      this.pendingRewards = [];
      rewards.forEach(reward => {
        target.onSuccess(reward);
      });
    }
  }

  getProductPrice(productId: string): string | null {
    const p = this.products.find(x => x.id === productId);
    return p ? p.price : null;
  }

  getStatus() {
    const store = this.getStore();
    if (!store) return 'Store NOT AVAILABLE';
    
    const count = store.products?.length ?? 0;
    const ready = this.isReady ? 'YES' : 'NO';
    const pending = this.pendingRewards.length;
    
    const productList = store.products?.map((p: any) => {
      return `${p.id}(${p.state})`;
    }).join(' ');
    
    return `IAP v13+ | Ready: ${ready} | Prod: ${count} | Pending: ${pending}\n[${productList}]`;
  }

  private waitForReady(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('IAP forReady timeout — proceeding anyway');
        resolve();
      }, 8000);
      this.readyCallbacks.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async purchase(productId: string) {
    this.lastPurchasedId = productId;
    const store = this.getStore();
    if (!store) throw new Error('Store není dostupný.');
    if (!this.isInitialized) throw new Error('Store není inicializován.');

    if (!this.isReady) {
      console.log('IAP Waiting for store ready...');
      await this.waitForReady();
    }

    const Platform = CdvPurchase.Platform || {};
    const googlePlay = Platform.GOOGLE_PLAY || 'android-playstore';
    
    console.log(`IAP Purchasing "${productId}"`);
    let product = store.get(productId, googlePlay) || store.get(productId);
    
    if (!product && store.products) {
      product = store.products.find((p: any) => p.id === productId);
    }
    
    if (!product) {
      throw new Error(`Produkt "${productId}" nebyl nalezen. Zkontrolujte připojení.`);
    }

    const ProductType = CdvPurchase.ProductType || {};
    const nonConsumableType = ProductType.NON_CONSUMABLE || 'non consumable';
    if (product.owned && product.type === nonConsumableType) {
      throw new Error(`Produkt již vlastníte.`);
    }

    try {
      const offer = product.getOffer ? product.getOffer() : null;
      const target = offer || product;
      console.log('IAP Ordering target:', target.id || target.productId || productId);
      const result = await store.order(target);
      
      if (result && result.isError) {
        throw new Error(result.message || 'Objednávka selhala');
      }
    } catch (err: any) {
      console.error('IAP Purchase Error:', err);
      if (this.handler) {
        this.handler.onError(err.message || 'Chyba při inicializaci platby');
      }
      throw err;
    }
  }

  private processPurchase(productId: string) {
    console.log('IAP Fulfilling reward for:', productId);
    let reward: Boost | string | null = null;

    switch (productId) {
      case 'xp_1day':
        reward = { type: 'xp_boost', multiplier: 2, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
        break;
      case 'xp15x':
        reward = { type: 'xp_boost', multiplier: 1.5, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
        break;
      case 'hp50':
        reward = { type: 'hp_regen', multiplier: 1.5, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
        break;
      case 'hp100':
        reward = { type: 'hp_regen', multiplier: 2.0, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
        break;
      case 'inv20':
      case 'inv24':
        reward = productId;
        break;
      default:
        console.warn('IAP Unknown product verified:', productId);
    }

    if (reward) {
      if (this.handler) {
        console.log('IAP Active handler found, delivering reward.');
        this.handler.onSuccess(reward);
      } else if (this.recoveryHandler) {
        console.log('IAP No active handler but recovery handler found, delivering reward.');
        this.recoveryHandler.onSuccess(reward);
      } else {
        console.log('IAP No handlers active, queueing pending reward.');
        this.pendingRewards.push(reward);
      }
    }
  }
}

export const purchaseService = new PurchaseService();

if (typeof window !== 'undefined') {
  (window as any).purchaseService = purchaseService;
  (window as any).debugIAP = () => alert(purchaseService.getStatus());
}
