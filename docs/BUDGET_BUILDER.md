# Budget Builder Feature

## Overview
A personal budget tracking tool where users can search for cards using Scryfall data, add them to their collection, and track prices in a centralized location. This helps players manage their weekly budget additions and plan future purchases.

## Existing Infrastructure

### ✅ Already Have
- **Scryfall Database:** Full card data with prices (scryfall_card_db)
- **Card Search API:** `/api/scryfall/autocomplete` and `/api/scryfall/cards/named`
- **Price Service:** Finds cheapest printing of each card across all sets
- **Permissions:** `budget_manage`, `budget_read`, `budget_manage_league`
- **League Budget:** `leagues.weekly_budget` column exists

## Database Schema Needed

### New Table: `user_budgets`
Tracks user's budget state per league.

```sql
CREATE TABLE user_budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  league_id INT NOT NULL,
  budget_used DECIMAL(10, 2) DEFAULT 0.00,
  budget_available DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_league (user_id, league_id)
);
```

### New Table: `budget_cards`
Tracks individual cards added to user's budget.

```sql
CREATE TABLE budget_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_budget_id INT NOT NULL,
  card_name VARCHAR(255) NOT NULL,
  scryfall_id VARCHAR(255),
  quantity INT DEFAULT 1,
  price_at_addition DECIMAL(10, 2),
  set_name VARCHAR(255),
  image_uri TEXT,
  card_faces JSON,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  week_added INT,
  notes TEXT,
  FOREIGN KEY (user_budget_id) REFERENCES user_budgets(id) ON DELETE CASCADE,
  INDEX idx_user_budget (user_budget_id)
);
```

## Backend API Endpoints

### Budget Management
```
GET    /api/budgets/league/:leagueId          - Get user's budget for league
POST   /api/budgets/league/:leagueId          - Initialize budget for league
PUT    /api/budgets/:budgetId                 - Update budget (admin recalculate)
```

### Card Management
```
GET    /api/budgets/:budgetId/cards           - List all cards in budget
POST   /api/budgets/:budgetId/cards           - Add card to budget
PUT    /api/budgets/:budgetId/cards/:cardId   - Update card (quantity, notes)
DELETE /api/budgets/:budgetId/cards/:cardId   - Remove card from budget
```

### Price Features
```
POST   /api/budgets/:budgetId/refresh-prices  - Recalculate all card prices
GET    /api/budgets/:budgetId/history         - Price history over time
GET    /api/budgets/:budgetId/summary         - Week-by-week summary
```

### Search Enhancement
```
GET    /api/scryfall/search                   - Enhanced search with filters
```

## Frontend Components

### 1. BudgetDashboard.js
Main view showing budget summary and quick stats.

**Features:**
- Current budget available/used
- Total deck value
- Weekly spending chart
- Quick add card search bar

**Props:**
```jsx
{
  leagueId: number,
  userId: number
}
```

### 2. CardSearch.js
Enhanced search with autocomplete and filtering.

**Features:**
- Autocomplete dropdown (using existing `/scryfall/autocomplete`)
- Show card image on hover
- Display cheapest price
- Filter by: color, type, mana cost, price range
- "Add to Budget" button

**State:**
```jsx
{
  searchQuery: string,
  suggestions: array,
  selectedCard: object,
  filters: {
    colors: array,
    types: array,
    priceMax: number,
    priceMin: number
  }
}
```

### 3. BudgetCardList.js
Displays all cards in user's budget.

**Features:**
- Sortable table (name, price, date added, week)
- Card images on hover
- Edit quantity inline
- Remove card button
- Filter by week added
- Show price changes (if price different from `price_at_addition`)
- Total at bottom

**Columns:**
| Card | Qty | Set | Price When Added | Current Price | Week Added | Actions |
| ---- | --- | --- | ---------------- | ------------- | ---------- | ------- |

### 4. WeeklySummary.js
Week-by-week breakdown of budget usage.

**Features:**
- Accordion style (each week expandable)
- Cards added per week
- Budget used that week
- Remaining budget
- Visual progress bar

**Display:**
```
Week 1 (Jan 6 - Jan 13) [$11 available]
  ├─ Budget Used: $8.50
  ├─ Remaining: $2.50
  └─ Cards: Lightning Bolt ($0.50), Brainstorm ($8.00)

Week 2 (Jan 14 - Jan 21) [$13.50 available]
  ├─ Budget Used: $12.00
  ├─ Remaining: $1.50
  └─ Cards: Sol Ring ($12.00)
```

### 5. PriceComparison.js
Compare current prices vs. price at addition.

**Features:**
- Highlight cards with significant price changes
- "Refresh All Prices" button
- Show cheapest set for each card
- Switch printing button (change to cheaper version)

## User Flow

### Adding a Card
1. User navigates to Budget Builder page
2. Searches for card in search bar
3. Autocomplete shows suggestions with prices
4. User selects card
5. Modal shows:
   - Card image
   - Cheapest printing (set, price)
   - Quantity selector
   - Notes field
   - Current budget available
6. User clicks "Add to Budget"
7. Backend validates budget available
8. Card added to `budget_cards`
9. `user_budgets.budget_used` incremented
10. Card appears in list

### Viewing Budget
1. User opens Budget Builder
2. Dashboard shows:
   - Budget available: $X.XX
   - Budget used: $Y.YY
   - Total cards: Z
3. Card list shows all added cards
4. Can filter by week, sort by price, name, date

### Refreshing Prices
1. User clicks "Refresh Prices" button
2. Backend queries Scryfall DB for current prices
3. Compares to `price_at_addition`
4. Shows price changes (green/red indicators)
5. Option to "Update Budget with Current Prices"

## Business Logic

### Budget Calculation
```javascript
// Initialize budget when user joins league
const initializeBudget = async (userId, leagueId) => {
  const league = await getLeague(leagueId);
  const currentWeek = league.current_week;
  
  const budget_available = league.weekly_budget * currentWeek;
  
  await db('user_budgets').insert({
    user_id: userId,
    league_id: leagueId,
    budget_used: 0,
    budget_available: budget_available
  });
};

// Add card to budget
const addCardToBudget = async (budgetId, card) => {
  const budget = await db('user_budgets').where({ id: budgetId }).first();
  const league = await db('leagues').where({ id: budget.league_id }).first();
  
  const totalCost = card.price * card.quantity;
  
  // Validate budget
  if (totalCost > budget.budget_available - budget.budget_used) {
    throw new Error('Insufficient budget');
  }
  
  // Add card
  await db('budget_cards').insert({
    user_budget_id: budgetId,
    card_name: card.name,
    scryfall_id: card.id,
    quantity: card.quantity,
    price_at_addition: card.price,
    set_name: card.set_name,
    image_uri: card.image_uri,
    card_faces: card.card_faces,
    week_added: league.current_week,
    notes: card.notes
  });
  
  // Update budget used
  await db('user_budgets')
    .where({ id: budgetId })
    .increment('budget_used', totalCost);
};

// Weekly budget update (cron job or manual trigger)
const updateWeeklyBudgets = async (leagueId) => {
  const league = await db('leagues').where({ id: leagueId }).first();
  
  await db('user_budgets')
    .where({ league_id: leagueId })
    .increment('budget_available', league.weekly_budget);
};
```

### Price Refresh Logic
```javascript
const refreshCardPrices = async (budgetId) => {
  const cards = await db('budget_cards')
    .where({ user_budget_id: budgetId })
    .select('*');
  
  const priceUpdates = [];
  
  for (const card of cards) {
    // Query scryfall DB for cheapest price
    const cheapestPrice = await scryfallDb('cards')
      .select(
        'name',
        scryfallDb.raw('JSON_EXTRACT(prices, "$.usd") AS usd'),
        'set_name',
        'image_uris'
      )
      .where({ name: card.card_name })
      .orderByRaw('CAST(JSON_EXTRACT(prices, "$.usd") AS DECIMAL(10,2))')
      .first();
    
    priceUpdates.push({
      card_id: card.id,
      card_name: card.card_name,
      price_at_addition: card.price_at_addition,
      current_price: parseFloat(cheapestPrice.usd),
      price_change: parseFloat(cheapestPrice.usd) - card.price_at_addition,
      cheapest_set: cheapestPrice.set_name
    });
  }
  
  return priceUpdates;
};
```

## UI/UX Mockup

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Budget Builder                                    [Refresh]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Budget Available: $45.50          Budget Used: $122.50     │
│  Total Cards: 87                   Deck Value: $168.00      │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🔍 Search for cards...                      [🔽 Filters]│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┤
│  │ Tabs: [All Cards] [By Week] [Price Changes]             │
│  ├─────────────────────────────────────────────────────────┤
│  │ Card Name     │ Qty │ Set │ Price │ Week │ Actions      │
│  ├───────────────┼─────┼─────┼───────┼──────┼──────────────┤
│  │ Lightning Bolt│  4  │ M21 │ $0.50 │  1   │ [✏️] [🗑️]   │
│  │ Brainstorm    │  1  │ EMA │ $8.00 │  1   │ [✏️] [🗑️]   │
│  │ Sol Ring      │  1  │ C21 │ $2.00 │  2   │ [✏️] [🗑️]   │
│  │ ...                                                       │
│  └───────────────────────────────────────────────────────────┘
│                                                               │
│  Total Budget Used: $168.00                                  │
└─────────────────────────────────────────────────────────────┘
```

## Navigation Integration

Add to navbar under Leagues dropdown:
```jsx
{user && activeLeague && (
  <>
    <NavDropdown.Item as={Link} to="/leagues/current">Current League</NavDropdown.Item>
    <NavDropdown.Item as={Link} to="/leagues/leaderboard">Leaderboard</NavDropdown.Item>
    <NavDropdown.Item as={Link} to="/leagues/budget-builder">Budget Builder</NavDropdown.Item>
    <NavDropdown.Item as={Link} to="/leagues/price-check">Price Check</NavDropdown.Item>
  </>
)}
```

## Implementation Phases

### Phase 1: Database Setup
- [ ] Create migration for `user_budgets` table
- [ ] Create migration for `budget_cards` table
- [ ] Add indexes for performance
- [ ] Test migrations up/down

### Phase 2: Backend API
- [ ] Create `budgetsController.js`
- [ ] Implement budget CRUD endpoints
- [ ] Implement card management endpoints
- [ ] Add price refresh logic
- [ ] Create `budgets.js` routes file
- [ ] Add permission checks (`budget_manage`, `budget_read`)
- [ ] Add tests

### Phase 3: Frontend Components
- [ ] Create `budgetApi.js` API client
- [ ] Build `BudgetDashboard.js` component
- [ ] Build `CardSearch.js` with autocomplete
- [ ] Build `BudgetCardList.js` table
- [ ] Build `WeeklySummary.js` accordion
- [ ] Add routing for `/leagues/budget-builder`
- [ ] Add to navbar

### Phase 4: Polish & Features
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add price change indicators
- [ ] Add export to CSV functionality
- [ ] Add deck import from Price Check
- [ ] Add "Suggest Cards" based on budget remaining

## Future Enhancements

### 1. Budget Alerts
- Email/notification when budget refreshes
- Alert when card prices drop significantly
- Reminder to use accumulated budget

### 2. Shopping List Mode
- "Wishlist" separate from budget
- Mark cards as "need to buy"
- Generate TCGPlayer cart link

### 3. Budget History
- Track changes over time
- Show price trends per card
- Historical spending chart

### 4. Shared Budget Planning
- League-wide budget tracker
- See what others are adding (opt-in)
- Popular cards this week

### 5. Integration with Decks
- One-click add deck to budget
- Compare deck price vs budget available
- Suggest swaps to fit budget

## Notes

- All prices should use TCG Market low (matches existing price check)
- Budget calculations happen server-side to prevent cheating
- Price refresh should be cached (don't hit DB on every page load)
- Consider Redis caching for frequently accessed budgets
- Mobile-responsive design critical (users shopping at LGS)
- Card images lazy-loaded for performance
