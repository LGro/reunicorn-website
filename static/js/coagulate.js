import veilid_load_wasm, * as veilid from './veilid_wasm.js';
import {
  veilidCoreInitConfig,
  veilidCoreStartupConfig,
} from './veilid_config.js';

export async function initVeilid() {
  console.log('loading veilid wasm...');
  await veilid_load_wasm();
  veilid.initialize_veilid_wasm();
  // Set veilid as a global so commands can be run in the browser console for debugging.
  window.veilid = veilid;
  console.log('veilid wasm loaded!');
}

export async function startVeilid() {
  console.log('starting veilid core...');
  veilid.initialize_veilid_core(JSON.stringify(veilidCoreInitConfig));

  veilid.startup_veilid_core(async (update) => {
    const data = JSON.parse(update);

    if (data?.kind === 'Log') {
      switch (data?.log_level) {
        case 'Warn':
          console.warn(data.message);
          break;
        case 'Info':
          console.info(data.message);
          break;
        case 'Debug':
          console.debug(data.message);
          break;
        default:
          console.log(data.message);
          break;
      }
    } else {
      console.log(data);
    }

    if (
      data.kind === 'Log' &&
      data?.message?.includes('Veilid API startup complete')
    ) {
      console.log('veilid core started!');
      veilid.attach();
    }
  }, JSON.stringify(veilidCoreStartupConfig));

  return veilid;
}

export async function stopVeilid() {
  await veilid.shutdown_veilid_core();
}

async function run() {
  console.log("About to init veilid");
  await initVeilid();
  console.log("About to start veilid");
  await startVeilid();

  console.log("About to get help");
  // console.log(await veilid.debug('help'))

  // Substring removes the # character
  const anchorContent = window.location.hash.substring(1);
  // NOTE: This would only work with a PSK, not with a pubkey
  // TODO: Handle if no PSK is present
  console.log(anchorContent);
  const [cryptoVersion, key, psk] = anchorContent.split(':');

  if (psk != undefined) {

    await new Promise(r => setTimeout(r, 8000));

    console.log("About to get routing context");
    let routingContext = await veilid.VeilidRoutingContext.create().withSequencing('EnsureOrdered').withDefaultSafety();

    console.log("About to get dht value");
    let readonlyDhtRecord = await routingContext.openDhtRecord(key);
    const getValueRes = await routingContext.getDhtValue(key, 0, true);
    // TODO: Localize by maybe just hiding and showing already existing content
    if (getValueRes.data.length > 0) {
      document.getElementById('coagulation-request-status').innerHTML = "Data available, install Coagulate now to automatically receive updates."
    } else {
      document.getElementById('coagulation-request-status').innerHTML = "An error happened, ask your contact for the invitation link again and install the Coagulate app."
    }

    return;

    if (cryptoVersion == 'VLD0') {
      const cryptoKind = 1447838768;
    }
    const body = getValueRes.data;
    const nonceLength = (await veilid.crypto_random_nonce(cryptoKind)).length;
    const bodyBytes = body.slice(0, body.length - nonceLength);
    const saltBytes = body.slice(body.length - nonceLength);

    let binaryString = '';
    saltBytes.forEach(byte => {
      binaryString += String.fromCharCode(byte);
    });

    // Encode the binary string to Base64
    const base64String = btoa(binaryString);
    console.log("NONCe B64", base64String);

    // NONCE should be S10GrCOGnWEJutpNfSiATz2yw8GjaF3a
    // Remove all trailing "="
    let nonce = btoa(saltBytes).replace(/=+$/, '');
    console.log("Nonce:", new TextDecoder().decode(saltBytes));
    const bodyString = btoa(bodyBytes).replace(/=+$/, '');
    const decrypted = veilid.crypto_decrypt_aead(cryptoKindVLD0, bodyString, nonce, psk);
    const decoder = new TextDecoder('utf-8');
    const decodedMessage = decoder.decode(decrypted);
    console.log(decodedMessage);

    console.log("Closing dht record");
    await routingContext.closeDhtRecord(key);

    await readonlyDhtRecord.close();

    console.log("Freeing routing context");
    routingContext.free();
  } else {
    console.log("Missing URL fragment");
  }

  console.log("Stopping veilid");
  await stopVeilid();

  console.log("Done.");
}

run();