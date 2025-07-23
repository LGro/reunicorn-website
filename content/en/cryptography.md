---
title: "Cryptography"
translationKey: cryptography
---

# Cryptography {.title .is-2}

Coagulate secures your private contact details and location sharing with the following cryptographic mechanisms.
We aim to strongly protect you against potentially malicious outside actors like governments, marketing companies, infrastructure operators, or other kinds of surveillance.
We help detect but only partly protect against attacks where one or multiple of your contacts turn against you by providing misleading information, be it by themselves or colluding with other malicious contacts.

## Sharing Information {.title .is-3}

All shared information with any individual contact is always end-to-end encrypted.

If you initially connect with a direct invite link or QR code, the first bits of shared information are encrypted with the symmetric key contained in the link or QR code.
After the connection has been established, the encryption is then transitioned to the main end-to-end encryption scheme.

The main end-to-end encryption scheme is public key cryptography based, where two users derive a symmetric key from their public/private key pairs and use this to encrypt and decrypt the information shared between them.

These key pairs are rotated as fast as possible, potentially from one update to the next, in the spirit of forward secrecy.
Specifically, when ever the shared information changes, a new follow up public key is proposed, which can be used by the recipient with their current contact specific key pair's secret key to encrypt their next update, which when received will cause the proposal key pair to be rotated into the slot of the established key material.
So in case an attacker captures an encrypted update and manages to crack the key, they are limited to decrypting only the updates for which this key was used, but not for the ones sent before or after the corresponding key material was rotated.

For details regarding the used cyphers and other cryptographic primitives, see [Veilid's current cryptography systems](https://veilid.com/how-it-works/cryptography/#current-cryptography-systems).

## Shared Contact Discovery {.title .is-3}

Users can figure out which connections they share with their contacts in a privacy preserving manner.
The goals of this scheme are that users only find out about connections to other users that they are connected with themselves, and that learning about connections of others does not create an opportunity to suggest non-existing connections to any of one's contacts.
Rather than using consistent identity keys across multiple contacts and leaving it to the contacts to compare the identities they know among each other in a privacy preserving manner, we shift control from the receiving user to the sharing users, reducing the risk of accidental leakage of social graph information.

The approach is based on each pair of users `A` and `B` deriving a secret `S_AB` based on their long lived identity key pairs.
For each of their other contacts, e.g. `C` they then hash this secret together with the recipient's i.e. `C`'s public identity key `Attest_AB_for_C = H(S_AB, ID_C)`.
When `C` receives `Attest_AB_for_C` from both `A` and `B` via their respective information sharing channels, then `C` learns that `A` and `B` already know each other.
If only `A` and not `B` would be connected with `C`, `C` would only receive `Attest_AB_for_C` from `A` and thus not learn anything about the connection between `A` and `B`.

To opt out of revealing a specific connection to a contact, a user can never start or later stop sharing the respective connection attestation.

### Malicious Recipients {.title .is-4}

Including the identity key in the hash prevents the recipient from maliciously re-using that hash to suggest non-existing connections to others.
In the above example, `C` can not abuse `Attest_AB_for_C` by e.g. sending it to another contact `D` because any valid connection attestation `D` receives is hashed with `ID_D` and not `ID_C`, and is thus impossible to match with `Attest_AB_for_C`.

### Malicious Collusion {.title .is-4}

A malicious `A` can hand `Attest_AB_for_C` to `F` who is connected with `C` but not with `B` and at the same time stop sharing `Attest_AB_for_C` with `C`.
This will make it seem to `C` that `B` and `F` are connected even though they are not.
If `A` has at any point in time shared `Attest_AB_for_C` with `C`, then `C` can defend against this by keeping a log of all hashes they have ever seen from `A` and looking for when they see the same hash from more than two contacts.
For the scenario where `A` never shared `Attest_AB_for_C` with `C` but immediately passes the attestation to `F`, `A` can not figure this out.

We do not protect against an attack like this one with two malicious contacts (here `A` and `F`) colluding to imply to the victim (here `C`) a non-existing connections between one of the malicious contacts (here `F`) and an innocent contact (here `B`) of the victim.
