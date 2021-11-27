import React, { useEffect, useState } from "react";
import { FiTwitter } from "react-icons/fi";
import { GiReceiveMoney } from "react-icons/gi";
import { IoMdCopy } from "react-icons/io";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import idl from "./idl.json";
import kp from "./keypair.json";
import "./App.scss";
import toast, { Toaster } from "react-hot-toast";
// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// get keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed",
};

// Change this up to be your Twitter if you want.
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [tipValue, setTipValue] = useState(0);
  const [gifList, setGifList] = useState([]);
  /*
   * Check if Phantom is Connected
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          // connect directly to wallet through the solana Object
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );
          // Set Address if avalaible
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    // Retrieve solana obj
    const { solana } = window;

    if (solana) {
      // Connect if obj is avalaible
      const response = await solana.connect();
      console.log(
        `Connected with Public key: ${response.publicKey.toString()}`
      );
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!");
      return;
    }
    console.log("Gif link:", inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue);

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error);
    }
  };
  const sendTip = async (spender) => {
    if (tipValue === 0) {
      console.log("You must send at least something");
    }
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const solVal = Number(tipValue) * Math.pow(10, 9);
      await program.rpc.sendSol(solVal, {
        accounts: {
          from: baseAccount.publicKey,
          to: spender,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
    } catch (error) {
      console.log("Error sending Tip:", error);
    }
  };
  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };
  const onTipAmountChange = (event) => {
    const { value } = event.target;
    setTipValue(value);
  };
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };
  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "Created a new BaseAccount w/ address:",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };
  /*
   * Render Button if not connected yet
   */
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );
  // Gifs container
  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    } else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              className="link-input"
              placeholder="Enter gif link!"
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* Map through gifList instead of TEST_GIFS */}
            {gifList.map((gif, i) => {
              let usrAddress = gif.userAddress.toString();
              return (
                <div className="gif-item" key={i}>
                  <img src={gif.gifLink} alt={gif.gifLink} />
                  <div className="flex flex-row mx-auto mt-2">
                    <IoMdCopy
                      size={22}
                      color="white"
                      onClick={() => copyAddress(usrAddress)}
                    />
                    <p className="text-white">
                      {usrAddress.substring(0, 6) +
                        "..." +
                        usrAddress.substring(
                          usrAddress.length - 6,
                          usrAddress.length
                        )}
                    </p>
                  </div>
                  {/*
                  <div className="flex flex-row">
                    <input
                      type="number"
                      placeholder="0.01 SOL"
                      onChange={onTipAmountChange}
                      className="rounded-xl bg-gray-900 text-white p-2 my-4 w-1/2"
                    />
                    <button
                      className="tip-button mx-auto"
                      onClick={() => sendTip(gif.userAddress)}
                    >
                      <div className="flex flex-row m-2">
                        Send tip <GiReceiveMoney size={20} className="ml-2" />
                      </div>
                    </button>
                  </div>
                  */}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };
  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log("Error in getGifList: ", error);
      setGifList(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");
      getGifList();
    }
  }, [walletAddress]);
  const copyAddress = (addy) => {
    navigator.clipboard.writeText(addy);
    toast.success("Copied Wallet Address!", {
      style: {
        borderRadius: "10px",
        background: "#131622",
        color: "#fff",
      },
    });
  };
  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection on the Solana Blockchain ✨
          </p>
          {/* Button shows up when not connected to Phantom */}
          {!walletAddress && renderNotConnectedContainer()}
          {/* Show list when connected */}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <FiTwitter color="white" size={24} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`Built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default App;
