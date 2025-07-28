---
title: "Interoperability"
translationKey: interop
---

# Interoperability {.title .is-2}

If you would like to build your own Veilid based Reunicorn compatible app, this page should contain all of the necessary specification.
However, we would encourage you to propose extensions or changes to Reunicorn before setting up independent projects, to focus efforts on a coherent solution.
If you are for example interested in creating a desktop or web app, the existing Flutter code base is a great starting point, let's discuss your plans in an [issue](https://github.com/LGro/reunicorn/issues).

## Sharing Schema {.title .is-3}

This schema describes the main payload encountered during a sharing relationship between two Reunicorn users.
In the following text, we consider the author of the payload following this schema on one hand, and the other as the recipient.

This schema is written as a UTF-8 encoded JSON string to the first sub-key of a Veilid DHT record, encrypted either with a pre-arranged shared secret or if available and `ack_handshake_complete` a key derived from the recipient's public key and the author's private key.
The remaining sub-keys optionally contain the encrypted binary representation of a profile picture.

- `int schema_version = 3`
- `ContactDetails details`
    - Author contact details, i.e. the information shared with the recipient.
- `Map<String, ContactAddressLocation> address_locations`
    - Author address locations with IDs as keys.
- `Map<String, ContactTemporaryLocation> temporary_locations`
    - Author temporary locations with IDs as keys.
- `List<String> connection_attestations`
    - Evidence for connections between the author and their contacts. See [[cryptography#shared-contact-discovery]] for more details.
- `List<ContactIntroduction> introductions`
    - List of introductions the author proposes for the recipient to other of their contacts.
- `String? share_back_d_h_t_key`
    - Optionally, the (typed) record key in string representation of a Veilid DHT record the author initialized for the recipient to share back with the author.
- `String? share_back_d_h_t_writer`
    - Optionally, the writer key-pair in string representation of a Veilid DHT record the author initialized for the recipient to share back with the author.
- `String next_identity_key`
    - The most recent author's public key that the recipient should use to derive a key to encrypt their shared information and decrypt the next update they receive.

### ContactDetails

- `Map<String, String> names`
    - Unique IDs with names, e.g. "1" with "Peter Parquet"
- `Map<String, String> phones`
    - Labels with phone numbers, e.g. "mobile" with the value "1234"
- `Map<String, String> emails`
    - Labels with email addresses, e.g. "work" with the value "peter@largecorp.co"
- `Map<String, String> websites`
    - Labels with websites, e.g. "blog" with "reunicorn.blogspot.tld"
- `Map<String, String> social_medias`
    - Labels with social media or messenger profile names, e.g. "Signal" with "Petr42"
- `Map<String, DateTime> events`
    - Labels with dates, e.g. "birthday" with the corresponding date

### ContactAddressLocation {.title .is-4}

- `double longitude`
    - Longitude of the location coordinate.
- `double latitude`
    - Latitude of the location coordinate.
- `String? address`
    - Location address string. Used to be optional, so parsing should not fail when it is missing but it should always be provided when creating one from scratch.

### ContactTemporaryLocation {.title .is-4}
- `double longitude`
    - Longitude of the location coordinate.
- `double latitude`
    - Latitude of the location coordinate.
- `String name`
    - Name of the location/event or short description.
- `String description`
    - Longer description
- `DateTime start`
    - Start timestamp, including timezone information.
- `DateTime end`
    - End timestamp, including timezone information.
- `String? address`
    - Optionally, location address string.
- `bool checked_in`
    - True if currently at that location.

### ContactIntroduction
- `String other_name`
    - Name of the contact the author would like to introduce the recipient with
- `FixedEncodedString43 other_public_key`
    - Public key of the contact the author would like to introduce the recipient with
- `String dht_record_key_receiving`
    - Veilid DHT record key (typed) where the introduced contact is sharing with the recipient
- `String dht_record_key_sharing`
    - Veilid DHT record key (typed) where the recipient can share with the introduced contact.
- `String dht_writer_sharing`
    - Veilid DHT record writer key-pair allowing the recipient to write information they want to share with the introduced contact to the corresponding DHT record key.
- `String? message`
    - Optionally, a message supporting the introduction.
