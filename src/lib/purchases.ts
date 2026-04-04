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
  private readyCallbacks: Array<() => void> = [];

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

    // Registrace produktů - zkusíme to co nejvíce "vanilla"
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
    store.when().approved((p: any) => {
      console.log('Purchase approved:', p.id);
      p.verify();
    });

    store.when().verified((p: any) => {
      console.log('Purchase verified:', p.id);
      p.finish();
      if (this.handler) {
        this.processPurchase(p.id);
      }
    });

    store.error((err: any) => {
      console.error('Store Error:', err.code, err.message);
      // Don't alert "null" errors if we can avoid it
      if (this.handler) {
        this.handler.onError(err.message || `Chyba obchodu (${err.code})`);
      }
    });

    // Čekáme na ready event
    store.ready(() => {
      this.isReady = true;
      const count = store.products?.length ?? 0;
      console.log(`IAP Store is READY. Products loaded: ${count}`);
      if (count === 0) {
        console.warn('IAP Store ready but 0 products — check Google Play Console product IDs and tester account.');
      }
      
      // Log loaded products for debugging
      store.products.forEach((p: any) => {
        console.log(`- Product: ${p.id} [${p.state}] registered=${p.registered}`);
      });

      // Spustíme čekající nákupy
      this.readyCallbacks.forEach(cb => cb());
      this.readyCallbacks = [];
    });

    // Initialize with the identified platform
    store.initialize([googlePlay])
      .then((errors: any[]) => {
        if (errors && errors.length > 0) {
          console.error('IAP Initialize Errors:', JSON.stringify(errors));
        } else {
          console.log('IAP Initialize completed successfully.');
        }
      })
      .catch((err: any) => {
        console.error('IAP Initialize Exception:', err);
      });

    console.log('IAP Store init() called. Waiting for ready...');
  }

  setHandler(handler: PurchaseHandler) {
    this.handler = handler;
  }

  getStatus() {
    const store = this.getStore();
    if (!store) return 'Store NOT AVAILABLE';
    if (!this.isInitialized) return 'Store NOT INITIALIZED';
    
    const count = store.products?.length ?? 0;
    const ready = this.isReady ? 'YES' : 'NO (waiting)';
    const internalPlatform = (CdvPurchase.Platform && CdvPurchase.Platform.GOOGLE_PLAY) || '???';
    
    // Detailní výpis pro každý produkt v paměti pluginu
    const productList = store.products?.map((p: any) => {
      const regStatus = p.registered ? 'reg' : 'NOTREG';
      return `${p.id}(${regStatus}|${p.state})`;
    }).join(' ');
    
    return `IAP v13+ | Ready: ${ready} | Plat: ${internalPlatform} | Prod: ${count}\n[${productList}]`;
  }

  private waitForReady(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    return new Promise((resolve) => {
      this.readyCallbacks.push(resolve);
      // Timeout fallback — pokud ready nepřijde do 10s, pokusíme se i tak
      setTimeout(() => {
        resolve();
      }, 10000);
    });
  }

  async purchase(productId: string) {
    const store = this.getStore();
    if (!store) {
      throw new Error('Store není dostupný v tomto prostředí.');
    }

    if (!this.isInitialized) {
      throw new Error('Store není inicializován. Zkuste restartovat aplikaci.');
    }

    // Počkáme, než bude store ready a produkty načteny
    if (!this.isReady) {
      console.log('Store not ready yet, waiting...');
      await this.waitForReady();
    }

    // Pokus najít produkt
    // V13+ doporučuje specifikovat i platformu pokud možno
    const Platform = CdvPurchase.Platform || {};
    const googlePlay = 'android-playstore';
    
    console.log(`Searching for product "${productId}" on platform "${googlePlay}"`);
    const product = store.get(productId, googlePlay) || store.get(productId);
    
    if (!product) {
      const allProducts = store.products?.map((p: any) => `${p.id}(reg:${p.registered})`).join(', ') || 'žádné';
      const readyState = this.isReady ? 'ready=YES' : 'ready=NO';
      throw new Error(
        `Produkt "${productId}" nebyl nalezen v obchodě.\n` +
        `V paměti: [${allProducts}]\n\n` +
        `Ujistěte se, že ID produktu odpovídá ID v Google Play Console.`
      );
    }

    // Zkontrolujeme, zda lze koupit
    if (product.owned && product.type === CdvPurchase.ProductType.NON_CONSUMABLE) {
      throw new Error(`Produkt "${productId}" již vlastníte.`);
    }

    console.log(`Initiating purchase for: ${productId}`, product);

    try {
      const result = await store.order(product);
      if (result && result.isError) {
        throw new Error(result.message || 'Objednávka selhala');
      }
    } catch (err: any) {
      console.error('Purchase Error:', err);
      if (this.handler) {
        this.handler.onError(err.message || 'Chyba při inicializaci platby');
      }
      throw err;
    }
  }

  private processPurchase(productId: string) {
    if (!this.handler) return;

    switch (productId) {
      case 'xp_1day':
        this.handler.onSuccess({ type: 'xp_boost', multiplier: 2, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
        break;
      case 'xp15x':
        this.handler.onSuccess({ type: 'xp_boost', multiplier: 1.5, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
        break;
      case 'hp50':
        this.handler.onSuccess({ type: 'hp_regen', multiplier: 1.5, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
        break;
      case 'hp100':
        this.handler.onSuccess({ type: 'hp_regen', multiplier: 2.0, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
        break;
      case 'inv20':
      case 'inv24':
        this.handler.onSuccess(productId);
        break;
      default:
        console.warn('Unknown product verified:', productId);
    }
  }
}

export const purchaseService = new PurchaseService();

// Expose service for mobile debugging
if (typeof window !== 'undefined') {
  (window as any).purchaseService = purchaseService;
  (window as any).debugIAP = () => alert(purchaseService.getStatus());
}
