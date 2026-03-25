const KEY = "dwallet_address_book";

export function getContacts() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function saveContact(name, address) {
  const contacts = getContacts();
  const i = contacts.findIndex(c => c.address.toLowerCase() === address.toLowerCase());
  if (i >= 0) contacts[i] = { ...contacts[i], name: name.trim() };
  else contacts.push({ id: Date.now(), name: name.trim(), address });
  localStorage.setItem(KEY, JSON.stringify(contacts));
}

export function deleteContact(address) {
  localStorage.setItem(KEY, JSON.stringify(
    getContacts().filter(c => c.address.toLowerCase() !== address.toLowerCase())
  ));
}

export function findContact(address) {
  return getContacts().find(c => c.address.toLowerCase() === address.toLowerCase());
}