# Awards System - Implementation Progress

## ✅ Completed

### Database Schema
- ✅ `awards` table: id, name, description
- ✅ `user_awards` table: id, user_id, award_id, league_id, awarded_at
- ✅ Foreign keys and cascade deletes configured
- ✅ Initial awards seeded via migration (20260106000000_seed_system_data.js)

### Backend API (Complete)
**Location:** 
- Controller: `controllers/awardsController.js`
- Routes: `routes/awards.js`
- Registered in: `routes/index.js`

**Endpoints:**
- `GET /api/awards` - List all awards
- `GET /api/awards/:awardId` - Get single award
- `POST /api/awards` - Create award (requires `award_manage` permission)
- `PUT /api/awards/:awardId` - Update award (requires `award_manage` permission)
- `DELETE /api/awards/:awardId` - Delete award (requires `award_manage` permission)
- `GET /api/awards/league/:leagueId` - Get all awards given in a league
- `POST /api/awards/give` - Give award to user (requires `award_manage` permission)
- `DELETE /api/awards/user-award/:userAwardId` - Remove award from user (requires `award_manage` permission)

**Features:**
- Duplicate name prevention
- Prevents deleting awards that have been given to users
- Prevents duplicate awards per user per league
- All routes authenticated
- Admin routes protected with `award_manage` permission

### Permissions
- ✅ `award_manage` - Create/edit/delete awards, give awards to users
- ✅ `award_vote` - Vote for awards (not yet implemented)
- ✅ `award_read_results` - View voting results (not yet implemented)

## 🚧 Pending Implementation

### Frontend
- [ ] Create `awardsApi.js` - API client functions
- [ ] Admin UI for award management (create/edit/delete awards)
- [ ] Admin UI for giving awards to users
- [ ] Display awards on user profiles
- [ ] Display awards on leaderboard (trophy icon for winners)

### Voting System (Future Feature)

#### Design Decisions Made:
**Two Types of Awards:**
1. **Automatic Awards** (assigned by system when league ends):
   - League Winner (1st place)
   - Finished Top 4 (places 2-4)

2. **Voted Awards** (require player voting):
   - MVP
   - Highest Win Rate  
   - Most Annoying Deck

#### Required Changes:
1. **Migration:** Add `award_type` to awards table
   ```sql
   award_type ENUM('automatic', 'voted') NOT NULL DEFAULT 'voted'
   ```

2. **Create `award_votes` table:**
   ```sql
   CREATE TABLE award_votes (
     id INT PRIMARY KEY AUTO_INCREMENT,
     award_id INT NOT NULL,
     league_id INT NOT NULL,
     voter_id INT NOT NULL,
     nominee_id INT NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE,
     FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
     FOREIGN KEY (voter_id) REFERENCES users(id) ON DELETE CASCADE,
     FOREIGN KEY (nominee_id) REFERENCES users(id) ON DELETE CASCADE,
     UNIQUE KEY unique_vote (award_id, league_id, voter_id)
   );
   ```

3. **Add voting period management to leagues:**
   - Option A: Add columns to leagues table:
     - `voting_start_date TIMESTAMP NULL`
     - `voting_end_date TIMESTAMP NULL`
     - `voting_status ENUM('not_started', 'open', 'closed') DEFAULT 'not_started'`
   
   - Option B: Create separate `league_voting_periods` table

4. **Backend Endpoints Needed:**
   - `GET /api/awards/league/:leagueId/voting-status` - Check if voting is open
   - `POST /api/awards/league/:leagueId/vote` - Submit vote (requires `award_vote`)
   - `GET /api/awards/league/:leagueId/votes` - Get current vote tallies (admin only)
   - `POST /api/awards/league/:leagueId/close-voting` - Tally votes and assign awards (admin)
   - `GET /api/awards/league/:leagueId/results` - View final results (requires `award_read_results`)

5. **Frontend Components Needed:**
   - Voting interface (ballot-style form)
   - Vote confirmation UI
   - Results display
   - Admin voting period management

#### Voting Flow:
1. Admin opens voting period for a league
2. Users see voting interface in their league dashboard
3. Users vote for each voted award category (one nominee per award)
4. Admin closes voting when period ends
5. Backend tallies votes automatically
6. Winner(s) get award assigned via `giveAward()`
7. Automatic awards (Winner, Top 4) assigned based on final standings
8. Results page shows all award recipients

## 📝 Notes
- Awards are league-specific (same award can be given to different users in different leagues)
- Award seed file location: `seeds/required/seed_awards.js`
- RBAC seed moved to migration: `20260106000000_seed_system_data.js`
- Frontend layout undecided - could be in LeagueAdminPage or separate Awards page

## 🎯 Next Steps (When Resuming)
1. Decide on frontend layout for award management
2. Create `awardsApi.js` frontend API client
3. Build admin award management UI
4. Test award CRUD operations
5. Design voting system database schema
6. Implement voting backend
7. Build voting frontend UI
