package com.nexhire.service;

import com.nexhire.dto.JobRequest;
import com.nexhire.dto.JobResponse;
import com.nexhire.entity.Job;
import com.nexhire.entity.City;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.JobRepository;
import com.nexhire.repository.CityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final CityRepository locationRepository;

    public List<JobResponse> getActiveJobs() {
        return jobRepository.findByActiveTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    public JobResponse getJobById(Long id) {
        Job job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + id));
        return toResponse(job);
    }

    public JobResponse createJob(JobRequest request) {
        City location = locationRepository.findById(request.getLocationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "City not found with id: " + request.getLocationId()));

        Job job = Job.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .requirements(request.getRequirements())
                .location(location)
                .build();

        return toResponse(jobRepository.save(job));
    }

    private JobResponse toResponse(Job job) {
        return JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .requirements(job.getRequirements())
                .locationName(job.getLocation().getName())
                .locationId(job.getLocation().getId())
                .driveDate(job.getDriveDate())
                .active(job.getActive())
                .createdAt(job.getCreatedAt())
                .build();
    }
}
