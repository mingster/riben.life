import CryptoJS from "crypto-js";

export class CryptoUtil {
	//private static readonly _SECURITY_KEY: string = process.env.SECURITY_KEY;
	private static readonly _SECURITY_KEY: string =
		"b07fccd6-7a7e-411b-bafb-bfef11cc8cd5";

	/*
  String plaintext = "1234567890";
  String encryptedText = "/X4KqzCddx9So7321NJhLw==";
  */

	encrypt(plainText: string) {
		// this is to follow java/c# implementation
		const secret_key = CryptoUtil._SECURITY_KEY.substring(0, 16);

		const key = CryptoJS.enc.Utf8.parse(secret_key);
		//const iv = CryptoJS.lib.WordArray.create(key.words.slice(0, 16));
		const iv = CryptoJS.enc.Utf8.parse(secret_key);

		//console.log(`key : ${CryptoJS.enc.Base64.stringify(key)}`);
		//console.log(`IV : ${CryptoJS.enc.Base64.stringify(iv)}`);

		// Encrypt the plaintext
		const cipherText = CryptoJS.AES.encrypt(plainText, key, {
			iv: iv,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7,
		});

		return cipherText.toString();
	}

	decrypt(cipherText: string) {
		const secret_key = CryptoUtil._SECURITY_KEY.substring(0, 16);

		const key = CryptoJS.enc.Utf8.parse(secret_key);
		const iv = CryptoJS.enc.Utf8.parse(secret_key);

		const decrypted = CryptoJS.AES.decrypt(cipherText, key, {
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7,
			iv: iv,
		});

		return decrypted.toString(CryptoJS.enc.Utf8);
	}
}
