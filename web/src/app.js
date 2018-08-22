import React, { Component } from "react"
import { Route, Switch, Redirect, withRouter } from 'react-router-dom'
import { connect } from "react-redux"
import { isWeb3Injected, getInjectedWeb3 } from "./contracts/web3"

import getDipDappDoeInstance from "./contracts/dip-dapp-doe"
import { fetchOpenGames } from "./store/actions"

import MainView from "./views/main"
import Container from "./widgets/container"

const GameView = () => <div>Game View</div>

const LoadingView = () => <div>Loading View</div>
const MessageView = props => <div>{props.message || ""}</div>

class App extends Component {
    componentDidMount() {
        if (isWeb3Injected()) {
            let web3 = getInjectedWeb3()
            this.DipDappDoe = getDipDappDoeInstance()

            web3.eth.getBlockNumber().then(blockNumber => {
                this.props.dispatch({ type: "SET_STARTING_BLOCK", blockNumber })

                return this.checkWeb3Status()
            }).then(() => {
                this.addListeners()

                this.checkInterval = setInterval(() => this.checkWeb3Status(), 1500)

                this.props.dispatch(fetchOpenGames(this.DipDappDoe))
            })
        }
        else {
            this.props.dispatch({ type: "SET_UNSUPPORTED" })
        }
    }

    componentWillUnmount() {
        if (this.checkInterval) clearInterval(this.checkInterval)
        if (this.creationEvent) this.creationEvent.unsubscribe()
        if (this.acceptedEvent) this.acceptedEvent.unsubscribe()
    }

    checkWeb3Status() {
        let web3 = getInjectedWeb3()
        return web3.eth.net.isListening().then(listening => {
            if (!listening) {
                return this.props.dispatch({ type: "SET_DISCONNECTED" })
            }

            return web3.eth.net.getNetworkType().then(id => {
                if (this.props.status.networkId == id) {
                    return
                }

                this.props.dispatch({ type: "SET_NETWORK_ID", networkId: id })

                return web3.eth.getAccounts().then(accounts => {
                    if (accounts.length != this.props.accounts.length || accounts[0] != this.props.accounts[0]) {
                        this.props.dispatch({ type: "SET", accounts })
                    }
                    this.props.dispatch({ type: "SET_CONNECTED" })
                })
            })
        })
    }

    addListeners() {
        // Work in progress

        this.creationEvent = this.DipDappDoe.events.GameCreated({
            // filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameCreated(event))
            .on('changed', function (event) {
                console.log('changed', event)
            })
            .on('error', error => message.error(error && error.message || error))

        this.acceptedEvent = this.DipDappDoe.events.GameAccepted({
            // filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
            fromBlock: this.props.status.startingBlock || 0
        })
            .on('data', event => this.onGameAccepted(event))
            .on('changed', function (event) {
                console.log('changed', event)
            })
            .on('error', error => message.error(error && error.message || error))
    }

    onGameCreated(event) {
        // console.log(event.returnValues.gameIdx)
        this.props.dispatch(fetchOpenGames(this.DipDappDoe))
    }
    onGameAccepted(event) {
        // console.log(event.returnValues.gameIdx)
        this.props.dispatch(fetchOpenGames(this.DipDappDoe))
    }

    render() {
        if (this.props.status.loading) return <LoadingView />
        else if (this.props.status.unsupported) return <MessageView message="Please, install Metamask for Chrome or Firefox" />
        else if (this.props.status.networkId != "ropsten") return <MessageView message="Please, switch to the Ropsten network" />
        else if (!this.props.status.connected) return <MessageView message="Your connection seems to be down" />
        else if (!this.props.accounts || !this.props.accounts.length) return <MessageView message="Please, unlock your wallet or create an account" />

        return <div>
            <Container>
                <Switch>
                    <Route path="/" exact component={MainView} />
                    <Route path="/games/:id" exact component={GameView} />
                    <Redirect to="/" />
                </Switch>
            </Container>
        </div>
    }
}

export default withRouter(connect(({ accounts, status, openGames }) => ({ accounts, status, openGames }))(App))
