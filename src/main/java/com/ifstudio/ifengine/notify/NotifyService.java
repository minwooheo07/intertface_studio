package com.ifstudio.ifengine.notify;

import com.ifstudio.ifengine.domain.IfMaster;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 실패/지연 알림. 스켈레톤에서는 로그만 남긴다.
 *
 * TODO 연동 후보:
 *  1) 메일: spring-boot-starter-mail 주석 해제 + JavaMailSender
 *  2) 다우오피스: 쪽지/알림 REST API 호출 (그룹웨어 담당자에게 API 스펙 확인)
 */
@Service
@Slf4j
public class NotifyService {

    public void onFailure(IfMaster m, String execId, int failCount) {
        log.warn("[알림] 인터페이스 실패 - {}({}) execId={} 실패 {}건",
                m.getIfName(), m.getIfId(), execId, failCount);
    }
}
