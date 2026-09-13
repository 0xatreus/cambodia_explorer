import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <main className="grid min-h-screen place-items-center bg-stone-50 p-6"><section className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-bold">The planner could not load</h1><p className="mt-2 text-slate-700">{this.state.error.message}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white">Reload planner</button></section></main>
    }
    return this.props.children
  }
}
