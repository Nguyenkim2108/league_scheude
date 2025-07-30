class LoLEsportsApp {
  constructor() {
    this.isLoading = false;
    this.currentDate = new Date();
    // Quản lý range cho main load events
    this.currentStartDate = null;
    this.currentEndDate = null;
    // Quản lý range riêng cho previous events
    this.prevStartDate = null;
    this.prevEndDate = null;
    // Quản lý range riêng cho next events  
    this.nextStartDate = null;
    this.nextEndDate = null;
    this.TIME_TO_SHOW_POPUP = 3 * 60 * 1000;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.debugCurrentState();
    await this.loadVideo();
    await this.loadBanners();
    await this.loadSocials();
    await this.loadPopup();
    await this.loadEvents();
  }

  setupEventListeners() {
    // Event listeners will be added dynamically when buttons are created
  }

  // Utility method to format date as YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get default date range based on currentDate
  getDefaultDateRange() {
    const startDate = new Date(this.currentDate);
    startDate.setDate(this.currentDate.getDate() - 3);
    const endDate = new Date(this.currentDate);
    endDate.setDate(this.currentDate.getDate() + 3);

    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    };
  }

  // Get current range info for debugging
  getCurrentRangeInfo() {
    return {
      currentDate: this.currentDate,
      currentStartDate: this.currentStartDate,
      currentEndDate: this.currentEndDate,
      prevStartDate: this.prevStartDate,
      prevEndDate: this.prevEndDate,
      nextStartDate: this.nextStartDate,
      nextEndDate: this.nextEndDate,
      defaultRange: this.getDefaultDateRange()
    };
  }

  // Debug method to log current state
  debugCurrentState() {
    console.log('=== Current App State ===');
    console.log('Current Date:', this.currentDate);
    console.log('Main Range - Start:', this.currentStartDate, 'End:', this.currentEndDate);
    console.log('Prev Range - Start:', this.prevStartDate, 'End:', this.prevEndDate);
    console.log('Next Range - Start:', this.nextStartDate, 'End:', this.nextEndDate);
    console.log('Default Range:', this.getDefaultDateRange());
    console.log('Is Loading:', this.isLoading);
    console.log('========================');
  }

  // Reset to default range
  resetToDefaultRange() {
    const defaultRange = this.getDefaultDateRange();
    this.currentStartDate = defaultRange.startDate;
    this.currentEndDate = defaultRange.endDate;
    console.log('Reset to default range:', defaultRange);
  }

  // Format date for display
  formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Validate date range
  isValidDateRange(startDate, endDate) {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  }

  // Add load previous button
  addLoadPrevButton(container, isFirst = false) {
    const existingBtn = document.getElementById('load-prev-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    const loadPrevBtn = document.createElement('button');
    loadPrevBtn.id = 'load-prev-btn';
    loadPrevBtn.className = 'btn btn-load-nav w-100 mb-3';
    loadPrevBtn.innerHTML = 'Tải trận trước';

    loadPrevBtn.addEventListener('click', () => {
      if (!this.isLoading) {
        this.loadPreviousEvents();
      } else {
        console.log('Đang tải dữ liệu, vui lòng đợi...');
      }
    });

    if (isFirst) {
      container.insertBefore(loadPrevBtn, container.firstChild);
    } else {
      container.appendChild(loadPrevBtn);
    }
  }

  // Add load next button
  addLoadNextButton(container) {
    const existingBtn = document.getElementById('load-next-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    const loadNextBtn = document.createElement('button');
    loadNextBtn.id = 'load-next-btn';
    loadNextBtn.className = 'btn btn-custom w-100 mt-3';
    loadNextBtn.innerHTML = 'Tải thêm';

    loadNextBtn.addEventListener('click', () => {
      if (!this.isLoading) {
        this.loadNextEvents();
      } else {
        console.log('Đang tải dữ liệu, vui lòng đợi...');
      }
    });

    container.appendChild(loadNextBtn);
  }


  async loadEvents(append = false) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      // Sử dụng range hiện tại hoặc default range
      let dateRange;
      if (this.currentStartDate && this.currentEndDate) {
        dateRange = {
          startDate: this.currentStartDate,
          endDate: this.currentEndDate
        };
      } else {
        dateRange = this.getDefaultDateRange();
        this.currentStartDate = dateRange.startDate;
        this.currentEndDate = dateRange.endDate;
      }

      console.log('Loading events with range:', dateRange);

      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`/api/events?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.events) {
        throw new Error('Invalid response format');
      }

      this.renderEventsByDate(data.events, append);

      // Show notification for new events
      if (append && data.events.length > 0) {
        this.showNotification(`✅ Đã tải thêm ${data.events.length} trận đấu mới`, 'success');
      } else if (append && data.events.length === 0) {
        this.showNotification('ℹ️ Không có trận đấu nào trong khoảng thời gian này', 'info');
      }

      // Scroll to bottom to show new events if appending
      if (append) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }

    } catch (error) {
      console.error('Lỗi khi tải dữ liệu trận đấu:', error);
      this.showError('Không thể tải dữ liệu trận đấu. Vui lòng thử lại.');
      this.showNotification('❌ Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.', 'error');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  async searchEvents() {
    // Reset to default range and load new data
    this.resetToDefaultRange();

    try {
      // Reset to page 1 and load new data
      document.getElementById('dates-container').innerHTML = '';
      await this.loadEvents(false);

    } catch (error) {
      console.error('Lỗi khi tìm kiếm:', error);
      this.showNotification('❌ Không thể tìm kiếm: ' + error.message, 'error');
    }
  }

  async loadMoreEvents() {
    if (!this.currentEndDate) return;

    // Calculate extended date range (add 3 more days)
    const endDate = new Date(this.currentEndDate);
    const extendedEndDate = new Date(endDate);
    extendedEndDate.setDate(endDate.getDate() + 3);

    const newEndDate = this.formatDate(extendedEndDate);

    // Update current range
    this.currentEndDate = newEndDate;

    // Load more events
    await this.loadEvents(true);
  }

  async loadPreviousEvents() {
    // Khởi tạo prev range nếu chưa có, dựa trên current start date hoặc default range
    if (!this.prevStartDate) {
      if (this.currentStartDate) {
        this.prevEndDate = this.currentStartDate;
        const startDate = new Date(this.currentStartDate);
        startDate.setDate(startDate.getDate() - 30);
        this.prevStartDate = this.formatDate(startDate);
      } else {
        // Nếu chưa có current range, sử dụng default range
        const defaultRange = this.getDefaultDateRange();
        this.prevEndDate = defaultRange.startDate;
        const startDate = new Date(defaultRange.startDate);
        startDate.setDate(startDate.getDate() - 30);
        this.prevStartDate = this.formatDate(startDate);
      }
    } else {
      // Mở rộng prev range về phía trước
      const currentStart = new Date(this.prevStartDate);
      currentStart.setDate(currentStart.getDate() - 30);
      this.prevStartDate = this.formatDate(currentStart);
    }

    // Validate the new range
    if (!this.isValidDateRange(this.prevStartDate, this.prevEndDate)) {
      console.error('Invalid date range for previous events');
      this.showNotification('❌ Khoảng thời gian không hợp lệ', 'error');
      return;
    }

    console.log('Loading previous events:', {
      prevStartDate: this.prevStartDate,
      prevEndDate: this.prevEndDate
    });

    // Load previous events với range riêng
    await this.loadEventsPrepend();
  }

  async loadNextEvents() {
    // Khởi tạo next range nếu chưa có, dựa trên current end date hoặc default range
    if (!this.nextEndDate) {
      if (this.currentEndDate) {
        this.nextStartDate = this.currentEndDate;
        const endDate = new Date(this.currentEndDate);
        endDate.setDate(endDate.getDate() + 30);
        this.nextEndDate = this.formatDate(endDate);
      } else {
        // Nếu chưa có current range, sử dụng default range
        const defaultRange = this.getDefaultDateRange();
        this.nextStartDate = defaultRange.endDate;
        const endDate = new Date(defaultRange.endDate);
        endDate.setDate(endDate.getDate() + 30);
        this.nextEndDate = this.formatDate(endDate);
      }
    } else {
      // Mở rộng next range về phía sau
      const currentEnd = new Date(this.nextEndDate);
      currentEnd.setDate(currentEnd.getDate() + 30);
      this.nextEndDate = this.formatDate(currentEnd);
    }

    // Validate the new range
    if (!this.isValidDateRange(this.nextStartDate, this.nextEndDate)) {
      console.error('Invalid date range for next events');
      this.showNotification('❌ Khoảng thời gian không hợp lệ', 'error');
      return;
    }

    console.log('Loading next events:', {
      nextStartDate: this.nextStartDate,
      nextEndDate: this.nextEndDate
    });

    // Load next events với range riêng
    await this.loadEventsAppend();
  }

  async loadEventsPrepend() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const params = new URLSearchParams({
        startDate: this.prevStartDate,
        endDate: this.prevEndDate
      });

      const response = await fetch(`/api/events?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.events) {
        throw new Error('Invalid response format');
      }

      // Prepend new events to existing ones
      this.renderEventsByDatePrepend(data.events);

      // Show notification for new events
      if (data.events.length > 0) {
        this.showNotification(`✅ Đã tải thêm ${data.events.length} trận đấu trước`, 'success');
      } else {
        this.showNotification('ℹ️ Không có trận đấu nào trong khoảng thời gian này', 'info');
      }

      // Scroll to top to show new events
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error('Lỗi khi tải dữ liệu trận đấu trước:', error);
      this.showError('Không thể tải dữ liệu trận đấu trước. Vui lòng thử lại.');
      this.showNotification('❌ Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.', 'error');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  async loadEventsAppend() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const params = new URLSearchParams({
        startDate: this.nextStartDate,
        endDate: this.nextEndDate
      });

      const response = await fetch(`/api/events?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.events) {
        throw new Error('Invalid response format');
      }

      // Append new events to existing ones
      this.renderEventsByDate(data.events, true);

      // Show notification for new events
      if (data.events.length > 0) {
        this.showNotification(`✅ Đã tải thêm ${data.events.length} trận đấu sau`, 'success');
      } else {
        this.showNotification('ℹ️ Không có trận đấu nào trong khoảng thời gian này', 'info');
      }

      // Scroll to bottom to show new events
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    } catch (error) {
      console.error('Lỗi khi tải dữ liệu trận đấu sau:', error);
      this.showError('Không thể tải dữ liệu trận đấu sau. Vui lòng thử lại.');
      this.showNotification('❌ Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.', 'error');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  renderEventsByDate(events, append = false) {
    const container = document.getElementById('dates-container');

    if (!append) {
      container.innerHTML = '';
      this.dateGroups = new Map();

      // Add load previous button at the top
      this.addLoadPrevButton(container, true);
    }

    if (events.length === 0 && !append) {
      container.innerHTML = '';

      // Add load previous button
      this.addLoadPrevButton(container, true);

      // Add no events message
      const noEventsDiv = document.createElement('div');
      noEventsDiv.className = 'text-center py-5';
      noEventsDiv.innerHTML = `
        <div class="mb-4">
          <h5 class="text-muted">Không tìm thấy trận đấu nào</h5>
          <p class="text-muted">trong khoảng thời gian từ ${this.formatDateForDisplay(this.currentStartDate)} đến ${this.formatDateForDisplay(this.currentEndDate)}.</p>
          <p class="text-muted">Hãy thử tải thêm trận đấu trước hoặc sau.</p>
        </div>
        <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="btn btn-custom">
          ⬆️ Lên đầu trang
        </button>
      `;
      container.appendChild(noEventsDiv);

      // Add load next button
      this.addLoadNextButton(container);
      return;
    }

    // Group events by date
    const groupedEvents = this.groupEventsByDate(events);

    // Render each date group - sort by actual date, not alphabetically
    Object.keys(groupedEvents)
      .sort((a, b) => {
        // Convert date strings to Date objects for proper comparison
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateA - dateB;
      })
      .forEach(dateKey => {
        const dateGroup = groupedEvents[dateKey];
        this.renderDateGroup(dateKey, dateGroup, container);
      });

    // Add load next button at the bottom
    this.addLoadNextButton(container);
  }

  renderEventsByDatePrepend(events) {
    const container = document.getElementById('dates-container');

    if (events.length === 0) {
      return;
    }

    // Group events by date
    const groupedEvents = this.groupEventsByDate(events);

    // Sort dates in ascending order (oldest first) for proper chronological order
    const sortedDateKeys = Object.keys(groupedEvents)
      .sort((a, b) => {
        // Convert date strings to Date objects for proper comparison
        const dateA = new Date(a.split('/').reverse().join('-'));
        const dateB = new Date(b.split('/').reverse().join('-'));
        return dateA - dateB;
      });

    // Find the position to insert (after load-prev-btn but before first date group)
    const firstDateGroup = container.querySelector('.date-group');

    // Create a document fragment to batch DOM operations
    const fragment = document.createDocumentFragment();

    // Render each date group in chronological order
    sortedDateKeys.forEach(dateKey => {
      const dateGroup = groupedEvents[dateKey];

      // Create the date group element
      const dateGroupElement = document.createElement('div');
      dateGroupElement.className = 'date-group';
      dateGroupElement.id = `date-group-${dateKey.replace(/\//g, '-')}`;

      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header text-center py-3';
      dateHeader.textContent = dateGroup.displayDate;

      const eventsInDate = document.createElement('div');
      eventsInDate.className = 'events-in-date';
      eventsInDate.id = `events-${dateKey.replace(/\//g, '-')}`;

      // Add events to this date group
      dateGroup.events.forEach(event => {
        const eventCard = this.createEventCard(event);
        eventsInDate.appendChild(eventCard);
      });

      dateGroupElement.appendChild(dateHeader);
      dateGroupElement.appendChild(eventsInDate);
      fragment.appendChild(dateGroupElement);
    });

    // Insert the fragment at the correct position
    if (firstDateGroup) {
      container.insertBefore(fragment, firstDateGroup);
    } else {
      const loadNextBtn = document.getElementById('load-next-btn');
      if (loadNextBtn) {
        container.insertBefore(fragment, loadNextBtn);
      } else {
        container.appendChild(fragment);
      }
    }

    // Add load previous button at the top after prepending
    this.addLoadPrevButton(container, true);
  }

  groupEventsByDate(events) {
    return events.reduce((groups, event) => {
      // Convert time to Vietnam timezone
      const vnTime = this.convertToVietnamTime(event.startTime);
      const dateKey = vnTime.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = {
          displayDate: vnTime.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          events: []
        };
      }

      groups[dateKey].events.push({
        ...event,
        vnTime: vnTime
      });

      return groups;
    }, {});
  }

  convertToVietnamTime(isoString) {
    const date = new Date(isoString);
    // Convert to Vietnam timezone (UTC+7)
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const vnTime = new Date(utcTime + (7 * 60 * 60 * 1000));
    return vnTime;
  }

  renderDateGroup(dateKey, dateGroup, container) {
    // Check if this date group already exists
    let dateGroupElement = document.getElementById(`date-group-${dateKey.replace(/\//g, '-')}`);

    if (!dateGroupElement) {
      // Create new date group
      dateGroupElement = document.createElement('div');
      dateGroupElement.className = 'date-group mb-4';
      dateGroupElement.id = `date-group-${dateKey.replace(/\//g, '-')}`;

      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header text-center py-3';
      dateHeader.textContent = dateGroup.displayDate;

      const eventsInDate = document.createElement('div');
      eventsInDate.className = 'events-in-date p-3';
      eventsInDate.id = `events-${dateKey.replace(/\//g, '-')}`;

      dateGroupElement.appendChild(dateHeader);
      dateGroupElement.appendChild(eventsInDate);
      container.appendChild(dateGroupElement);
    }

    // Add events to this date group
    const eventsContainer = dateGroupElement.querySelector('.events-in-date');
    dateGroup.events.forEach(event => {
      const eventCard = this.createEventCard(event);
      eventsContainer.appendChild(eventCard);
    });
  }

  renderDateGroupPrepend(dateKey, dateGroup, container) {
    // This function is now simplified since the ordering logic is handled in renderEventsByDatePrepend
    // Check if this date group already exists
    let dateGroupElement = document.getElementById(`date-group-${dateKey.replace(/\//g, '-')}`);

    if (!dateGroupElement) {
      // Create new date group
      dateGroupElement = document.createElement('div');
      dateGroupElement.className = 'date-group';
      dateGroupElement.id = `date-group-${dateKey.replace(/\//g, '-')}`;

      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header text-center py-3';
      dateHeader.textContent = dateGroup.displayDate;

      const eventsInDate = document.createElement('div');
      eventsInDate.className = 'events-in-date';
      eventsInDate.id = `events-${dateKey.replace(/\//g, '-')}`;

      dateGroupElement.appendChild(dateHeader);
      dateGroupElement.appendChild(eventsInDate);
    }

    // Add events to this date group
    const eventsContainer = dateGroupElement.querySelector('.events-in-date');
    dateGroup.events.forEach(event => {
      const eventCard = this.createEventCard(event);
      eventsContainer.appendChild(eventCard);
    });

    return dateGroupElement;
  }

  createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card mb-3 p-3';

    const team1 = event.matchTeams[0] || {};
    const team2 = event.matchTeams[1] || {};

    // Determine winner classes
    const team1Winner = team1.outcome === 'win' ? 'winner' : '';
    const team2Winner = team2.outcome === 'win' ? 'winner' : '';

    // Format state class and translate state
    const stateClass = event.state.replace(/([A-Z])/g, '-$1').toLowerCase();
    const stateText = this.translateState(event.state);

    // Format time for Vietnam timezone
    const timeText = event.vnTime ?
      event.vnTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) :
      (event.formattedTime ? event.formattedTime.time : 'N/A');

    card.innerHTML = `
      <div class="position-absolute top-0 end-0 m-2">
        <span class="badge bg-secondary">${timeText}</span>
      </div>
      
      <div class="d-flex align-items-center mb-3">
        <img src="${event.league.image}" alt="${event.league.name}" class="league-logo me-3" 
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjNDYzNzE0Ii8+CjxwYXRoIGQ9Ik0yMCAzMEwxMCAxNUgzMEwyMCAzMFoiIGZpbGw9IiNDODlCM0MiLz4KPC9zdmc+'">
        <div>
          <h5 class="mb-1">${event.league.name}</h5>
          <small class="text-muted">${event.blockName}</small>
        </div>
      </div>
      
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="badge badge-custom">${event.matchFormat}</span>
        <span class="badge badge-state-${stateClass}">${stateText}</span>
      </div>
      
      <div class="row g-3 align-items-center">
        <div class="col-md-5">
          <div class="d-flex align-items-center team ${team1Winner}">
            <img src="${team1.image}" alt="${team1.code}" class="team-logo me-2"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDUiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NSA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiBmaWxsPSIjNDYzNzE0Ii8+CjxjaXJjbGUgY3g9IjIyLjUiIGN5PSIyMi41IiByPSI4IiBmaWxsPSIjQzg5QjNDIi8+CjwvdXZnPg=='">
            <div class="flex-grow-1">
              <div class="fw-bold">${team1.code || 'TBD'}</div>
              <small class="text-muted">${team1.name || ''}</small>
            </div>
            ${event.state === 'completed' ? `<span class="fs-4 fw-bold text-warning">${team1.gameWins}</span>` : ''}
          </div>
        </div>
        
        <div class="col-2 text-center">
          <strong class="text-warning">VS</strong>
        </div>
        
        <div class="col-md-5">
          <div class="d-flex align-items-center team ${team2Winner}">
            <img src="${team2.image}" alt="${team2.code}" class="team-logo me-2"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDUiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NSA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ1IiBoZWlnaHQ9IjQ1IiBmaWxsPSIjNDYzNzE0Ii8+CjxjaXJjbGUgY3g9IjIyLjUiIGN5PSIyMi41IiByPSI4IiBmaWxsPSIjQzg5QjNDIi8+CjwvdXZnPg=='">
            <div class="flex-grow-1">
              <div class="fw-bold">${team2.code || 'TBD'}</div>
              <small class="text-muted">${team2.name || ''}</small>
            </div>
            ${event.state === 'completed' ? `<span class="fs-4 fw-bold text-warning">${team2.gameWins}</span>` : ''}
          </div>
        </div>
      </div>
    `;

    return card;
  }

  translateState(state) {
    const stateMap = {
      'unstarted': 'Chưa bắt đầu',
      'inProgress': 'Đang diễn ra',
      'completed': 'Đã kết thúc'
    };
    return stateMap[state] || state;
  }

  updatePagination(pagination) {
    this.totalPages = pagination.totalPages;
    const loadMoreBtn = document.getElementById('load-more-btn');

    if (pagination.hasNext) {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = `Tải thêm trận đấu (${pagination.currentPage}/${pagination.totalPages})`;
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

  showLoading() {
    const container = document.getElementById('dates-container');
    if (container.children.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-custom d-inline-block me-2"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      `;
    }

    // Disable all buttons during loading
    const loadPrevBtn = document.getElementById('load-prev-btn');
    const loadNextBtn = document.getElementById('load-next-btn');

    if (loadPrevBtn) {
      loadPrevBtn.disabled = true;
      loadPrevBtn.innerHTML = '<div class="spinner-custom d-inline-block me-2"></div> Đang tải...';
    }

    if (loadNextBtn) {
      loadNextBtn.disabled = true;
      loadNextBtn.innerHTML = '<div class="spinner-custom d-inline-block me-2"></div> Đang tải...';
    }
  }

  hideLoading() {
    const loading = document.querySelector('.text-center.py-5');
    if (loading) {
      loading.remove();
    }

    // Re-enable all buttons after loading
    const loadPrevBtn = document.getElementById('load-prev-btn');
    const loadNextBtn = document.getElementById('load-next-btn');

    if (loadPrevBtn) {
      loadPrevBtn.disabled = false;
      loadPrevBtn.innerHTML = 'Tải thêm';
    }

    if (loadNextBtn) {
      loadNextBtn.disabled = false;
      loadNextBtn.innerHTML = 'Tải thêm';
    }
  }

  showError(message) {
    const container = document.getElementById('dates-container');
    if (container.children.length === 0) {
      container.innerHTML = `
        <div class="no-events" style="color: #ff6b6b;">
          ❌ ${message}
          <br><br>
          <button onclick="location.reload()" style="
            background: #C89B3C;
            color: #0F1419;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-right: 10px;
          ">🔄 Thử lại</button>
          <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" style="
            background: #0596AA;
            color: #F0E6D2;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          ">⬆️ Lên đầu trang</button>
        </div>
      `;
    }
  }

  // Utility method to show notifications
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#4caf50' : '#C89B3C'};
      color: white;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 4000);
  }

  // Load video from server using video_frame key
  async loadVideo() {
    try {
      const response = await fetch('/api/video');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.video) {
          this.renderVideo(data.video);
        } else {
          this.hideVideoSection();
        }
      } else {
        this.hideVideoSection();
      }
    } catch (error) {
      console.error('Lỗi khi tải video:', error);
      this.hideVideoSection();
    }
  }

  // Render video from video_frame data
  renderVideo(video) {
    const videoSection = document.getElementById('video-section');
    const videoContainer = document.getElementById('video-container');

    if (video && video.embed_url) {
      videoContainer.innerHTML = `
        <iframe 
          src="${video.embed_url}" 
          class="video-frame"
          frameborder="0" 
          allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      `;
      videoSection.style.display = 'block';
    } else {
      this.hideVideoSection();
    }
  }

  // Hide video section if no video available
  hideVideoSection() {
    const videoSection = document.getElementById('video-section');
    videoSection.style.display = 'none';
  }

  // Load banners from server
  async loadBanners() {
    try {
      const response = await fetch('/api/banners');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.banners) {
          this.renderBanners('banner1', data.banners.banner1 || []);
          this.renderBanners('banner2', data.banners.banner2 || []);
        } else {
          this.hideBannerSections();
        }
      } else {
        this.hideBannerSections();
      }
    } catch (error) {
      console.error('Lỗi khi tải banners:', error);
      this.hideBannerSections();
    }
  }

  // Render banners and initialize Swiper
  renderBanners(bannerType, banners) {
    // Get all wrappers for this banner type (desktop and mobile)
    const desktopWrapper = document.getElementById(`${bannerType}-wrapper`);
    const mobileWrapper = document.getElementById(`${bannerType}-mobile-wrapper`);
    const desktopSwiper = document.getElementById(`${bannerType}-swiper`);
    const mobileSwiper = document.getElementById(`${bannerType}-mobile-swiper`);

    if (!banners || banners.length === 0) {
      if (desktopSwiper) desktopSwiper.style.display = 'none';
      if (mobileSwiper) mobileSwiper.style.display = 'none';
      return;
    }

    // Function to create banner slides
    const createSlides = (wrapper) => {
      if (!wrapper) return;

      wrapper.innerHTML = '';
      banners.forEach(banner => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide banner-slide';
        slide.innerHTML = `
          <img 
            src="${banner.image_url}" 
            alt="Banner" 
            class="banner-image"
            onerror="this.style.display='none'"
          >
        `;

        // Add click handler to open link
        slide.addEventListener('click', () => {
          if (banner.link_href) {
            window.open(banner.link_href, '_blank');
          }
        });

        wrapper.appendChild(slide);
      });
    };

    // Create slides for both desktop and mobile
    createSlides(desktopWrapper);
    createSlides(mobileWrapper);

    // Show swiper containers
    if (desktopSwiper) desktopSwiper.style.display = 'block';
    if (mobileSwiper) mobileSwiper.style.display = 'block';

    // Initialize Swipers
    this.initializeSwiper(bannerType);
    this.initializeSwiper(bannerType + '-mobile');
  }

  // Initialize Swiper for banner
  initializeSwiper(bannerType) {
    const swiper = new Swiper(`#${bannerType}-swiper`, {
      slidesPerView: 1,
      spaceBetween: 10,
      loop: true,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      breakpoints: {
        640: {
          slidesPerView: 1,
          spaceBetween: 15,
        },
        768: {
          slidesPerView: 1,
          spaceBetween: 20,
        }
      }
    });

    return swiper;
  }

  // Hide banner sections if no banners available
  hideBannerSections() {
    const bannerIds = [
      'banner1-swiper', 'banner2-swiper',
      'banner1-mobile-swiper', 'banner2-mobile-swiper'
    ];

    bannerIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
  }

  // Social Icons Management
  async loadSocials() {
    try {
      const response = await fetch('/api/socials');
      if (response.ok) {
        const data = await response.json();
        this.renderSocials(data.socials);
      }
    } catch (error) {
      console.error('Error loading socials:', error);
    }
  }

  renderSocials(socials) {
    const container = document.getElementById('social-icons');
    if (!container) return;

    container.innerHTML = '';

    const socialConfig = {
      zalo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg',
      facebook: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/2023_Facebook_icon.svg',
      tiktok: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Tiktok_icon.svg',
      telegram: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg'
    };

    socials.forEach(social => {
      const config = socialConfig[social.type];
      if (config) {
        const socialElement = document.createElement('a');
        socialElement.href = social.link;
        socialElement.target = '_blank';
        socialElement.innerHTML = `<img src="${config}" alt="${social.type}" style="width: 30px; height: 30px;">`;
        socialElement.title = social.type.charAt(0).toUpperCase() + social.type.slice(1);
        container.appendChild(socialElement);
      }
    });
  }

  // Popup Management
  async loadPopup() {
    try {
      const response = await fetch('/api/popup');
      if (response.ok) {
        const data = await response.json();
        if (data.popup) {
          this.setupPopup(data.popup);
        }
      }
    } catch (error) {
      console.error('Error loading popup:', error);
    }
  }

  setupPopup(popup) {
    const popupOverlay = document.getElementById('popup-overlay');
    const popupImage = document.getElementById('popup-image');
    const popupClose = document.getElementById('popup-close');

    if (!popupOverlay || !popupImage || !popupClose) return;

    // Set popup image
    popupImage.src = popup.image_url;
    popupImage.alt = 'Popup';

    // Add click handler to popup image
    popupImage.onclick = () => {
      window.open(popup.link_url, '_blank');
    };

    // Add close handler
    popupClose.onclick = () => {
      this.closePopup();
    };

    // Add escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePopup();
      }
    });

    // Check if popup should be shown
    this.checkPopupTimer();
  }

  checkPopupTimer() {
    // Show popup immediately on first load
    setTimeout(() => {
      this.showPopup();
    }, 2000);
  }

  showPopup() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
      popupOverlay.classList.add('show');
    }
  }

  closePopup() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
      popupOverlay.classList.remove('show');
      
      // Show popup again after 3 minutes
      setTimeout(() => {
        this.showPopup();
      }, this.TIME_TO_SHOW_POPUP);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LoLEsportsApp();
});

// Add some CSS for notifications animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

