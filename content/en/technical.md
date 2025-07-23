---
title: "Technical"
translationKey: technical
---

# Technical {.title .is-2}

For everyone who is curious about what is under the hood, here are the essentials.

## Data Flow & Privacy {.title .is-3}

The information you share with others is end-to-end encrypted and stored in the Veilid network.
When you retrieve shared information, the information of who's information you request is protected, so that no meta-data about your social graph is leaked.

The Open Street Map integration, the address search auto-complete, and geocoding capabilities are provided by the european provider [MapTiler](MapTiler.com).
As such, tied to your current IP address, they receive information about which segments of the world map you are looking at, up to the map tile resolution.
Also, they see the addresses you share, but never the ones of your contacts, again keeping your social graph information private.
We have ideas about adding a privacy proxy via Veilid to strip the IP address information from the requests to MapTiler, as well as downloadable map information to further improve the protection of your privacy.
Find out more about how [MapTiler protects users](https://maptiler.zendesk.com/hc/en-us/articles/4405446306961-Personal-data-in-MapTiler-Cloud).

## Further Information {.title .is-3}

Read more about the cryptographic protocols and concepts on the [cryptography](cryptography) page.
And in case you are curious about creating Coagulate compatible apps, our notes on [interoperability](interop) should help.
