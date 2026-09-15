import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type MainTab = 'supplyChain' | 'serviceMeasure' | 'dispatchWip' | 'regionalDistributor'
type ViewTab = 'visualizations' | 'tables'
type DisplayMode = 'TP' | 'EFP'

// RD Status only — whether the RD uploaded stock for the selected date.
// 'uploaded' is a current stock count of 1 or more; 'not-uploaded' is 0, i.e.
// the RD is still carrying an older figure. '' is no filter.
export type UploadCountFilter = '' | 'uploaded' | 'not-uploaded'

interface Filters {
    classification: string
    // On RD Status this holds franchise branch CODES; other tabs use it for branch_id.
    branch: string[]
    sku: string[]
    // RD Status only — franchise distributor codes
    distributor: string[]
    // RD Status only — the same two things picked by name instead of code, so
    // the bar can offer "Branch Code" and "Branch" as separate dropdowns.
    branchName: string[]
    distributorName: string[]
    uploadCount: UploadCountFilter
    dateFrom: string
    dateTo: string
}

interface SalesDashboardState {
    mainTab: MainTab
    activeTab: ViewTab
    displayMode: DisplayMode
    filters: Filters
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const today = new Date()
const toDate = formatLocal(today)
const fromDate = formatLocal(new Date(today.getFullYear(), today.getMonth(), 1))

const initialState: SalesDashboardState = {
    mainTab: 'supplyChain',
    activeTab: 'visualizations',
    displayMode: 'TP',
    filters: {
        classification: '',
        branch: [],
        sku: [],
        distributor: [],
        branchName: [],
        distributorName: [],
        uploadCount: '',
        dateFrom: fromDate,
        dateTo: toDate,
    },
}

export const salesDashboardSlice = createSlice({
    name: 'salesDashboard',
    initialState,
    reducers: {
        setMainTab: (state, action: PayloadAction<MainTab>) => {
            state.mainTab = action.payload
        },
        setActiveTab: (state, action: PayloadAction<ViewTab>) => {
            state.activeTab = action.payload
        },
        setDisplayMode: (state, action: PayloadAction<DisplayMode>) => {
            state.displayMode = action.payload
        },
        setFilter: (state, action: PayloadAction<{ key: keyof Filters; value: string | string[] }>) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (state.filters as any)[action.payload.key] = action.payload.value
        },
        resetFilters: (state) => {
            const now = new Date()
            state.filters = {
                classification: '',
                branch: [],
                sku: [],
                distributor: [],
                branchName: [],
                distributorName: [],
                uploadCount: '',
                dateFrom: formatLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
                dateTo: formatLocal(now),
            }
        },
    },
})

export const { setMainTab, setActiveTab, setDisplayMode, setFilter, resetFilters } = salesDashboardSlice.actions
export default salesDashboardSlice.reducer
