import veilid_load_wasm, * as veilid from './veilid_wasm.js';
import {
  veilidCrypto,
} from './veilid_wasm.js';
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

function decryptBytes(
  kind,
  bytes,
  sharedSecret
) {
  const nonce = new TextDecoder().decode(
    bytes.subarray(0, veilidCrypto.NONCE_LENGTH_ENCODED)
  );
  const encryptedBytes = bytes.subarray(veilidCrypto.NONCE_LENGTH_ENCODED);

  return veilidCrypto.decryptAead(kind, encryptedBytes, nonce, sharedSecret);
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

    const body = getValueRes.data;
    const bodyBytes = body.slice(0, body.length - veilidCrypto.NONCE_LENGTH);
    const saltBytes = body.slice(body.length - veilidCrypto.NONCE_LENGTH);

    // Encode the binary string to Base64
    let binaryNonceString = '';
    saltBytes.forEach(byte => {
      binaryNonceString += String.fromCharCode(byte);
    });
    const nonce = btoa(binaryNonceString);

    const decrypted = veilidCrypto.decryptAead(cryptoVersion, bodyBytes, nonce, psk);

    const decoder = new TextDecoder('utf-8');
    const decodedMessage = decoder.decode(decrypted);
    const profile = JSON.parse(decodedMessage);
    console.log('FOUND PROFILE');
    console.log(profile);

    // TODO: Localize by maybe just hiding and showing already existing content
    // TODO: Handle payload being empty; i.e. unshared or not sharing yet
    if (getValueRes.data.length > 0) {
      document.getElementById('coagulation-request-status').innerHTML = "Data available, install Coagulate now to automatically receive updates."
    } else {
      document.getElementById('coagulation-request-status').innerHTML = "An error happened, ask your contact for the invitation link again and install the Coagulate app."
    }
    document.getElementById('coagulation-request-payload').innerHTML = JSON.stringify(profile, null, 4);

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