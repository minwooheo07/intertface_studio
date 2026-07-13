package com.ifstudio.ifengine.engine.scheduler;

import com.ifstudio.ifengine.domain.IfMaster;
import com.ifstudio.ifengine.repository.IfMasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 기동 시 IF_MASTER(USE_YN='Y', CRON_EXPR 있음)를 읽어 Quartz 잡을 등록한다.
 * 마스터 변경 후에는 POST /api/admin/reload-jobs 로 재적재.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JobRegistrar {

    private final Scheduler scheduler;
    private final IfMasterRepository masterRepo;

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        try {
            int n = reload();
            log.info("인터페이스 스케줄 {}건 등록 완료", n);
        } catch (SchedulerException e) {
            log.error("스케줄 등록 실패", e);
        }
    }

    public int reload() throws SchedulerException {
        scheduler.clear();
        int count = 0;
        for (IfMaster m : masterRepo.findByUseYn("Y")) {
            if (m.getCronExpr() == null || m.getCronExpr().isBlank()) continue;

            JobDetail job = JobBuilder.newJob(InterfaceJob.class)
                    .withIdentity(m.getIfId(), "IF")
                    .usingJobData("ifId", m.getIfId())
                    .build();

            Trigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(m.getIfId(), "IF")
                    .withSchedule(CronScheduleBuilder.cronSchedule(m.getCronExpr())
                            .withMisfireHandlingInstructionDoNothing())
                    .build();

            scheduler.scheduleJob(job, trigger);
            log.info("스케줄 등록: {} ({})", m.getIfId(), m.getCronExpr());
            count++;
        }
        return count;
    }
}
