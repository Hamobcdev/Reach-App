import { createClient } from "@supabase/supabase-js";
import algosdk from "algosdk";
import { getAlgodClient } from "../algorand/services/algorandClient.js"; // Adjust path if needed
import dotenv from "dotenv";

dotenv.config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Algorand
const algodClient = getAlgodClient();
const account = algosdk.mnemonicToSecretKey(process.env.ALGORAND_MNEMONIC);

// POST /emergency: Submit emergency case
export async function POST_emergency(req) {
  const { user_id, description } = await req.json();
  const { data, error } = await supabase
    .from("emergency_cases")
    .insert({
      user_id,
      description,
      is_verified_by_ngo: false,
      is_handled: false,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  // Log to Algorand
  const note = Buffer.from(`Emergency case: ${data.id}`).toString("base64");
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: account.addr,
    to: account.addr, // Self-transfer for logging
    amount: 0,
    note: Buffer.from(note, "base64"),
    suggestedParams: await algodClient.getTransactionParams().do(),
  });
  const signedTxn = txn.signTxn(account.sk);
  await algodClient.sendRawTransaction(signedTxn).do();

  return new Response(JSON.stringify({ case: data }), { status: 200 });
}

// POST /verify: NGO verifies case
export async function POST_verify(req) {
  const { case_id, user_wallet } = await req.json();
  const { data, error } = await supabase
    .from("emergency_cases")
    .update({ is_verified_by_ngo: true, user_wallet, is_handled: false })
    .eq("id", case_id)
    .eq("is_verified_by_ngo", false)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ case: data }), { status: 200 });
}

// POST /disburse: Disburse funds to verified user
export async function POST_disburse(req) {
  const { case_id, amount } = await req.json();
  const { data, error } = await supabase
    .from("emergency_cases")
    .select("user_wallet")
    .eq("id", case_id)
    .eq("is_verified_by_ngo", true)
    .single();

  if (error || !data.user_wallet) {
    return new Response(
      JSON.stringify({ error: "Case not verified or wallet missing" }),
      { status: 400 }
    );
  }

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: account.addr,
    to: data.user_wallet,
    amount: Math.floor(amount * 1e6), // ALGO to microALGO
    note: Buffer.from("CrisisAid disbursement"),
    suggestedParams: await algodClient.getTransactionParams().do(),
  });
  const signedTxn = txn.signTxn(account.sk);
  const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
  await algosdk.waitForConfirmation(algodClient, txId, 4);

  // Update case as handled
  await supabase
    .from("emergency_cases")
    .update({ is_handled: true })
    .eq("id", case_id);

  return new Response(JSON.stringify({ txId }), { status: 200 });
}

// GET /balance: Check account balance
export async function GET_balance(req) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) {
    return new Response(JSON.stringify({ error: "Address required" }), {
      status: 400,
    });
  }
  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    const balance = Number(accountInfo.amount) / 1e6;
    return new Response(JSON.stringify({ balance }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
}

// POST /remit: Send remittance to user
export async function POST_remit(req) {
  const { recipient_address, amount } = await req.json();
  if (!algosdk.isValidAddress(recipient_address)) {
    return new Response(
      JSON.stringify({ error: "Invalid recipient address" }),
      { status: 400 }
    );
  }

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: account.addr,
    to: recipient_address,
    amount: Math.floor(amount * 1e6), // ALGO to microALGO
    note: Buffer.from("CrisisAid remittance"),
    suggestedParams: await algodClient.getTransactionParams().do(),
  });
  const signedTxn = txn.signTxn(account.sk);
  const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
  await algosdk.waitForConfirmation(algodClient, txId, 4);

  return new Response(JSON.stringify({ txId }), { status: 200 });
}
